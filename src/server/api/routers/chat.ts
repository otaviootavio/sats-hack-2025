import { z } from "zod";
import { env } from "~/env";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { schnorr, utils as secpUtils, hashes as nobleHashes } from "@noble/secp256k1";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";

import type { Prisma, PrismaClient } from "@prisma/client";
import { FundingStatus } from "@prisma/client";

// Configure noble sync hashes (required for sync schnorr/ecdsa operations)
nobleHashes.sha256 ??= (message: Uint8Array) => sha256(message);
nobleHashes.hmacSha256 ??= (key: Uint8Array, message: Uint8Array) => hmac(sha256, key, message);

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const HIGHLIGHT_SATS = 100_000; // 0.001 BTC in sats

const formatSatsToBtcString = (sats: number): string => (sats / 1e8).toFixed(8);

const blockstreamVoutSchema = z.object({
  value: z.number().optional().nullable(),
  scriptpubkey: z.string().optional().nullable(),
  scriptpubkey_asm: z.string().optional().nullable(),
  scriptpubkey_type: z.string().optional().nullable(),
  scriptpubkey_address: z.string().optional().nullable(),
  valuecommitment: z.string().optional().nullable(),
  asset: z.string().optional().nullable(),
  assetcommitment: z.string().optional().nullable(),
  noncecommitment: z.string().optional().nullable(),
  nonce: z.string().optional().nullable(),
});

const blockstreamTxSchema = z.object({
  txid: z.string(),
  vin: z.array(z.object({
    txid: z.string(),
    vout: z.number(),
  })),
  vout: z.array(blockstreamVoutSchema),
});

type BlockstreamVin = { txid: string; vout: number };
type BlockstreamVout = {
  n: number;
  valueSats: number | null;
  valueBtc: string | null;
  scriptPubKey: string | null;
  scriptPubKeyAsm: string | null;
  scriptPubKeyType: string | null;
  scriptPubKeyAddress: string | null;
  valueCommitment: string | null;
  assetId: string | null;
  assetCommitment: string | null;
  nonceCommitment: string | null;
};
type BlockstreamTx = {
  txid: string;
  vin: BlockstreamVin[];
  vout: BlockstreamVout[];
};

class BlockstreamTxError extends Error {
  constructor(public readonly code: "FETCH_FAILED" | "PARSE_FAILED") {
    super(code);
    this.name = "BlockstreamTxError";
  }
}

const fetchBlockstreamTx = async (txid: string): Promise<BlockstreamTx> => {
  const normalizedTxid = txid.trim().toLowerCase();
  const res = await fetch(`https://blockstream.info/liquidtestnet/api/tx/${normalizedTxid}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new BlockstreamTxError("FETCH_FAILED");
  }
  const json: unknown = await res.json();
  try {
    const parsed = blockstreamTxSchema.parse(json);
    return {
      txid: parsed.txid.toLowerCase(),
      vin: parsed.vin.map(v => ({ ...v, txid: v.txid.toLowerCase() })),
      vout: parsed.vout.map((o, n) => {
        const valueSats = o.value ?? null;
        return {
          n,
          valueSats,
          valueBtc: valueSats !== null ? formatSatsToBtcString(valueSats) : null,
          scriptPubKey: o.scriptpubkey ?? null,
          scriptPubKeyAsm: o.scriptpubkey_asm ?? null,
          scriptPubKeyType: o.scriptpubkey_type ?? null,
          scriptPubKeyAddress: o.scriptpubkey_address ?? null,
          valueCommitment: o.valuecommitment ?? null,
          assetId: o.asset?.toLowerCase() ?? null,
          assetCommitment: o.assetcommitment ?? null,
          nonceCommitment: o.noncecommitment ?? o.nonce ?? null,
        };
      }),
    };
  } catch {
    throw new BlockstreamTxError("PARSE_FAILED");
  }
};

const findHighlightedOutput = (vout: BlockstreamVout[]): BlockstreamVout | null =>
  vout.find((entry) => entry.valueSats !== null && entry.valueSats === HIGHLIGHT_SATS) ?? null;

// Helper: extract txid from faucet HTML response
function extractTxIdFromFaucetResponse(body: string): string | null {
  const regex = /with transaction\s+([0-9a-fA-F]{64})/;
  return regex.exec(body)?.[1]?.toLowerCase() ?? null;
}

// Helper: fetch tx from Blockstream, persist snapshot & selection, and return standard shape
// Note: Accept both Prisma.TransactionClient and PrismaClient shapes
async function fetchAndPersistFundingTx(
  db: Prisma.TransactionClient | PrismaClient,
  chatId: string,
  fundingTxId: string,
) {
  const tx = await fetchBlockstreamTx(fundingTxId);
  const selected = findHighlightedOutput(tx.vout);

  await db.chat.update({
    where: { id: chatId },
    data: {
      fundingTxSnapshot: tx as Prisma.InputJsonValue,
      fundingUtxoVout: selected?.n ?? null,
      fundingUtxoValueSats: selected?.valueSats ?? null,
      fundingUtxoNonceHex: selected?.nonceCommitment ?? null,
      fundingStatus: selected
        ? FundingStatus.COMPLETED
        : FundingStatus.AWAITING_CONFIRMATION,
    },
  });

  return {
    ok: true as const,
    txid: tx.txid,
    vin: tx.vin,
    vout: tx.vout,
    fundingTxId,
    selected: selected
      ? {
          voutIndex: selected.n,
          valueSats: selected.valueSats ?? null,
          nonceHex: selected.nonceCommitment ?? null,
        }
      : null,
  } as const;
}

export const chatRouter = createTRPCRouter({
  // --- Wallet endpoints (POC) ---
  createWallet: protectedProcedure
    .input(z.object({ chatId: z.string(), reset: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true },
      });
      if (!chat) return { ok: false as const, error: "NOT_FOUND" as const };

      const secret = env.AUTH_SECRET ?? "dev-secret";
      const key = scryptSync(secret, "simplicity-wallet", 32);
      const iv = randomBytes(12);

      // Generate secp256k1 secret (valid) and x-only pubkey
      const skBytes = secpUtils.randomSecretKey();
      const skHex = bytesToHex(skBytes);
      const pubBytes = schnorr.getPublicKey(skBytes); // 32 bytes x-only
      const pubHex = bytesToHex(pubBytes);

      // Encrypt private key (hex string) with AES-256-GCM
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(skHex, "utf8")),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      const payload = Buffer.concat([ciphertext, tag]);
      const encB64 = payload.toString("base64");
      const ivB64 = iv.toString("base64");

      // Use raw SQL to avoid Prisma type mismatch before generating client
      await ctx.db.$executeRaw`UPDATE "Chat"
        SET "walletPubHex" = ${pubHex}, "walletPrivEnc" = ${encB64}, "walletPrivIv" = ${ivB64}
        WHERE "id" = ${input.chatId} AND "userId" = ${userId}`;

      return { ok: true as const, pubHex: `0x${pubHex}` };
    }),

  getWalletPubkey: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await ctx.db.$queryRaw<{ walletPubHex: string | null }[]>`
        SELECT "walletPubHex" FROM "Chat" WHERE "id" = ${input.chatId} AND "userId" = ${userId} LIMIT 1
      `;
      if (!rows || rows.length === 0) return { ok: false as const, error: "NOT_FOUND" as const };
      const pubHex = rows[0]?.walletPubHex ? `0x${rows[0].walletPubHex}` : null;
      return { ok: true as const, pubHex };
    }),

  signPlaceholder: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        txid: z.string().regex(/^[0-9a-fA-F]{64}$/),
        voutIndex: z.number().int().nonnegative(),
        programBase64: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const rows = await ctx.db.$queryRaw<{ walletPrivEnc: string | null; walletPrivIv: string | null }[]>`
        SELECT "walletPrivEnc", "walletPrivIv" FROM "Chat" WHERE "id" = ${input.chatId} AND "userId" = ${userId} LIMIT 1
      `;
      if (!rows || rows.length === 0) return { ok: false as const, error: "NOT_FOUND" as const };
      const walletPrivEnc = rows[0]?.walletPrivEnc;
      const walletPrivIv = rows[0]?.walletPrivIv;
      if (!walletPrivEnc || !walletPrivIv) {
        return { ok: false as const, error: "NO_WALLET" as const };
      }

      // Decrypt private key
      const secret = env.AUTH_SECRET ?? "dev-secret";
      const key = scryptSync(secret, "simplicity-wallet", 32);
      const iv = Buffer.from(walletPrivIv, "base64");
      const payload = Buffer.from(walletPrivEnc, "base64");
      if (payload.length < 17) return { ok: false as const, error: "BAD_PAYLOAD" as const };
      const ciphertext = payload.subarray(0, payload.length - 16);
      const tag = payload.subarray(payload.length - 16);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plainBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const privHex = plainBuf.toString("utf8").trim();
      if (!/^[0-9a-fA-F]{64}$/.test(privHex)) {
        return { ok: false as const, error: "BAD_KEY" as const };
      }

      // Compute placeholder digest: sha256(txid_bytes || vout_le_u32 || program_base64_bytes)
      const txBytes = Buffer.from(hexToBytes(input.txid.toLowerCase()));
      const voutBytes = Buffer.alloc(4);
      voutBytes.writeUInt32LE(input.voutIndex >>> 0, 0);
      const progBytes = Buffer.from(input.programBase64, "base64");
      const concat = Buffer.concat([txBytes, voutBytes, progBytes]);
      const digest = sha256(concat);

      // Sign with BIP340 (x-only Schnorr)
      const sig = schnorr.sign(digest, hexToBytes(privHex));
      const sigHex = `0x${bytesToHex(sig)}`;
      return { ok: true as const, sigHex };
    }),
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
          cursor: z
            .object({
              createdAt: z.date(),
              id: z.string(),
            })
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor;

      const items = await ctx.db.chat.findMany({
        where: {
          userId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      let nextCursor: { createdAt: Date; id: string } | undefined = undefined;
      if (items.length > limit) {
        const next = items.pop()!;
        nextCursor = { createdAt: next.createdAt, id: next.id };
      }
      return { items, nextCursor } as const;
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          selectedExampleValue: z.string().optional(),
          source: z.string().optional(),
          argsJson: z.string().optional(),
          witJson: z.string().optional(),
          faucetUrl: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const title = (input?.title ?? "Untitled").trim() || "Untitled";
      const chat = await ctx.db.chat.create({
        data: {
          userId,
          title,
          selectedExampleValue: input?.selectedExampleValue ?? null,
          source: input?.source ?? "",
          argsJson: input?.argsJson ?? "",
          witJson: input?.witJson ?? "",
          faucetUrl: input?.faucetUrl ?? null,
          fundingTxId: null,
          // fundingStatus defaults to NO_ADDRESS (schema default)
        },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      });

      await ctx.db.user.update({
        where: { id: userId },
        data: { selectedChatId: chat.id },
      });
      return chat;
    }),

  get: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: {
          id: true,
          title: true,
          selectedExampleValue: true,
          source: true,
          argsJson: true,
          witJson: true,
          faucetUrl: true,
          fundingTxId: true,
          fundingTxSnapshot: true,
          fundingUtxoVout: true,
          fundingUtxoValueSats: true,
          fundingUtxoNonceHex: true,
          address: true,
          fundingStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return chat ?? null;
    }),

  update: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        title: z.string().optional(),
        selectedExampleValue: z.string().nullable().optional(),
        source: z.string().optional(),
        argsJson: z.string().optional(),
        witJson: z.string().optional(),
        faucetUrl: z.string().nullable().optional(),
        fundingTxId: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true, fundingStatus: true },
      });
      if (!existing) return { ok: false as const };
      const data: Prisma.ChatUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.selectedExampleValue !== undefined)
        data.selectedExampleValue = input.selectedExampleValue;
      if (input.source !== undefined) data.source = input.source;
      if (input.argsJson !== undefined) data.argsJson = input.argsJson;
      if (input.witJson !== undefined) data.witJson = input.witJson;
      if (input.faucetUrl !== undefined) data.faucetUrl = input.faucetUrl;
      if (input.fundingTxId !== undefined) data.fundingTxId = input.fundingTxId;
      if (input.address !== undefined) data.address = input.address;

      // Basic state transitions
      const currentStatus: FundingStatus = existing.fundingStatus ?? FundingStatus.NO_ADDRESS;
      if (input.address !== undefined) {
        if (input.address && currentStatus === FundingStatus.NO_ADDRESS) {
          data.fundingStatus = FundingStatus.READY_TO_FUND;
        } else if (!input.address) {
          // If address cleared, reset to NO_ADDRESS
          data.fundingStatus = FundingStatus.NO_ADDRESS;
        }
      }
      if (input.faucetUrl !== undefined && input.faucetUrl) {
        data.fundingStatus = FundingStatus.AWAITING_TXID;
      }
      if (input.fundingTxId !== undefined && input.fundingTxId) {
        data.fundingStatus = FundingStatus.AWAITING_CONFIRMATION;
      }

      await ctx.db.chat.update({
        where: { id: input.chatId },
        data,
      });
      return { ok: true as const };
    }),

  requestFunding: protectedProcedure
    .input(
      z.object({ chatId: z.string() })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true, faucetUrl: true },
      });
      if (!chat) return { ok: false as const, error: "NOT_FOUND" as const };

      const faucetUrl = chat.faucetUrl ?? "";
      if (!faucetUrl) return { ok: false as const, error: "MISSING_URL" as const };

      // Allowlist the faucet host and protocol
      let u: URL;
      try {
        u = new URL(faucetUrl);
      } catch {
        return { ok: false as const, error: "INVALID_URL" as const };
      }
      const allowedHosts = new Set(["liquidtestnet.com", "www.liquidtestnet.com"]);
      if (u.protocol !== "https:" || !allowedHosts.has(u.hostname)) {
        return { ok: false as const, error: "URL_NOT_ALLOWED" as const };
      }

      try {
        const response = await fetch(faucetUrl, { method: "GET" });
        const body = await response.text();
        const fundingTxId = extractTxIdFromFaucetResponse(body);

        await ctx.db.chat.update({
          where: { id: input.chatId },
          data: {
            fundingTxId,
            fundingStatus: fundingTxId
              ? FundingStatus.AWAITING_CONFIRMATION
              : FundingStatus.AWAITING_TXID,
          },
        });

        return { ok: true as const, fundingTxId };
      } catch {
        return { ok: false as const, error: "FETCH_FAILED" as const };
      }
    }),

  // Initiates funding: constructs faucet URL, fetches it, extracts txid, and updates status
  initiateFunding: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true, address: true },
      });
      if (!chat) return { ok: false as const, error: 'NOT_FOUND' as const };
      if (!chat.address) return { ok: false as const, error: 'NO_ADDRESS' as const };

      const faucetUrl = `https://liquidtestnet.com/faucet?address=${encodeURIComponent(chat.address)}&action=lbtc`;

      // Set faucetUrl and status first
      await ctx.db.chat.update({
        where: { id: input.chatId },
        data: { faucetUrl, fundingStatus: FundingStatus.AWAITING_TXID },
      });

      try {
        const response = await fetch(faucetUrl, { method: 'GET' });
        const body = await response.text();
        const fundingTxId = extractTxIdFromFaucetResponse(body);

        await ctx.db.chat.update({
          where: { id: input.chatId },
          data: {
            fundingTxId,
            fundingStatus: fundingTxId
              ? FundingStatus.AWAITING_CONFIRMATION
              : FundingStatus.AWAITING_TXID,
          },
        });

        return { ok: true as const, faucetUrl, fundingTxId };
      } catch {
        return { ok: false as const, error: 'FETCH_FAILED' as const };
      }
    }),

  fetchTx: protectedProcedure
    .input(
      z.object({ txid: z.string().regex(/^[0-9a-fA-F]{64}$/) })
    )
    .query(async ({ input }) => {
      try {
        const tx = await fetchBlockstreamTx(input.txid);
        return { ok: true as const, txid: tx.txid, vin: tx.vin, vout: tx.vout };
      } catch (error) {
        const code =
          error instanceof BlockstreamTxError ? error.code : ("FETCH_FAILED" as const);
        return { ok: false as const, error: code };
      }
    }),

  // Returns cached funding tx for the chat if present; otherwise fetches, persists, and returns it
  getFundingTx: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: {
          id: true,
          fundingTxId: true,
          fundingTxSnapshot: true,
          fundingUtxoVout: true,
          fundingUtxoValueSats: true,
          fundingUtxoNonceHex: true,
          fundingStatus: true,
        },
      });
      if (!chat) return { ok: false as const, error: "NOT_FOUND" as const };
      if (chat.fundingTxSnapshot) {
        const snap = chat.fundingTxSnapshot as unknown as Partial<BlockstreamTx>;
        const txid = typeof snap?.txid === "string" ? snap.txid : chat.fundingTxId ?? "";
        const vin = Array.isArray(snap?.vin) ? snap.vin : [];
        const vout = Array.isArray(snap?.vout) ? snap.vout : [];
        return {
          ok: true as const,
          txid,
          vin,
          vout,
          fundingTxId: chat.fundingTxId ?? null,
          selected: chat.fundingUtxoVout === null || chat.fundingUtxoVout === undefined
            ? null
            : {
                voutIndex: chat.fundingUtxoVout,
                valueSats: chat.fundingUtxoValueSats ?? null,
                nonceHex: chat.fundingUtxoNonceHex ?? null,
              },
        } as const;
      }
      if (!chat.fundingTxId) return { ok: false as const, error: "NO_TXID" as const };

      // Fetch from Blockstream and persist
      try {
        return await fetchAndPersistFundingTx(ctx.db, input.chatId, chat.fundingTxId);
      } catch (error) {
        const code =
          error instanceof BlockstreamTxError ? error.code : ("FETCH_FAILED" as const);
        return { ok: false as const, error: code };
      }
    }),

  // Forces a fresh fetch of the funding tx and persists the new snapshot
  refetchFundingTx: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true, fundingTxId: true },
      });
      if (!chat) return { ok: false as const, error: "NOT_FOUND" as const };
      if (!chat.fundingTxId) return { ok: false as const, error: "NO_TXID" as const };
      try {
        return await fetchAndPersistFundingTx(ctx.db, input.chatId, chat.fundingTxId);
      } catch (error) {
        const code =
          error instanceof BlockstreamTxError ? error.code : ("FETCH_FAILED" as const);
        return { ok: false as const, error: code };
      }
    }),

  setActive: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const owns = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId },
        select: { id: true },
      });
      if (!owns) return { ok: false as const };
      await ctx.db.user.update({ where: { id: userId }, data: { selectedChatId: input.chatId } });
      return { ok: true as const };
    }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { selectedChatId: true },
    });
    if (!user?.selectedChatId) return null;
    const chat = await ctx.db.chat.findFirst({
      where: { id: user.selectedChatId, userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    return chat ?? null;
  }),
});


