import { z } from "zod";
import { env } from "~/env";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { schnorr, utils as secpUtils, hashes as nobleHashes } from "@noble/secp256k1";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";

// Configure noble sync hashes (required for sync schnorr/ecdsa operations)
nobleHashes.sha256 ??= (message: Uint8Array) => sha256(message);
nobleHashes.hmacSha256 ??= (key: Uint8Array, message: Uint8Array) => hmac(sha256, key, message);

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

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
        select: { id: true },
      });
      if (!existing) return { ok: false as const };

      await ctx.db.chat.update({
        where: { id: input.chatId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.selectedExampleValue !== undefined
            ? { selectedExampleValue: input.selectedExampleValue }
            : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.argsJson !== undefined ? { argsJson: input.argsJson } : {}),
          ...(input.witJson !== undefined ? { witJson: input.witJson } : {}),
          ...(input.faucetUrl !== undefined ? { faucetUrl: input.faucetUrl } : {}),
          ...(input.fundingTxId !== undefined ? { fundingTxId: input.fundingTxId } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
        },
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
        // Try to extract the transaction id from the response HTML
        // Example line:
        // Sent 100000 sats to address <addr> with transaction <txid>.
        const regex = /with transaction\s+([0-9a-fA-F]{64})/;
        const match = regex.exec(body);
        const fundingTxId = match?.[1]?.toLowerCase() ?? null;

        await ctx.db.chat.update({
          where: { id: input.chatId },
          data: {
            fundingTxId,
          },
        });

        return { ok: true as const, fundingTxId };
      } catch {
        return { ok: false as const, error: "FETCH_FAILED" as const };
      }
    }),

  fetchTx: protectedProcedure
    .input(
      z.object({ txid: z.string().regex(/^[0-9a-fA-F]{64}$/) })
    )
    .query(async ({ input }) => {
      const url = `https://blockstream.info/liquidtestnet/api/tx/${input.txid}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        return { ok: false as const };
      }
      const json = (await res.json()) as unknown as {
        txid: string;
        vin: Array<{ txid: string; vout: number }>;
        vout: Array<{ value?: number } & Record<string, unknown>>;
      };

      const vin = (json.vin ?? []).map((v) => ({
        txid: v.txid,
        vout: v.vout,
      }));
      const vout = (json.vout ?? []).map((o, idx) => {
        const valueSats = typeof o.value === "number" ? o.value : null;
        const valueBtc =
          typeof o.value === "number"
            ? (o.value / 1e8).toFixed(8)
            : null;
        return { n: idx, valueSats, valueBtc };
      });

      return { ok: true as const, txid: json.txid, vin, vout };
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
        },
      });
      if (!chat) return { ok: false as const, error: "NOT_FOUND" as const };
      if (chat.fundingTxSnapshot) {
        const snap = chat.fundingTxSnapshot as unknown as {
          txid: string;
          vin: Array<{ txid: string; vout: number }>;
          vout: Array<{ n: number; valueSats: number | null; valueBtc: string | null }>;
        };
        return {
          ok: true as const,
          txid: snap.txid,
          vin: snap.vin,
          vout: snap.vout,
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
        const url = `https://blockstream.info/liquidtestnet/api/tx/${chat.fundingTxId}`;
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) return { ok: false as const, error: "FETCH_FAILED" as const };
        const json = (await res.json()) as unknown as {
          txid: string;
          vin: Array<{ txid: string; vout: number }>;
          vout: Array<{ value?: number; nonce?: string } & Record<string, unknown>>;
        };
        const vin = (json.vin ?? []).map((v) => ({ txid: v.txid, vout: v.vout }));
        const vout = (json.vout ?? []).map((o, idx) => {
          const valueSats = typeof o.value === "number" ? o.value : null;
          const valueBtc = typeof o.value === "number" ? (o.value / 1e8).toFixed(8) : null;
          return { n: idx, valueSats, valueBtc };
        });
        const highlightBtcString = "0.00100000";
        const selected = vout.find((o) => o.valueBtc === highlightBtcString) ?? null;
        const selectedIdx = selected?.n ?? null;
        const selectedSats = selected?.valueSats ?? null;
        const selectedNonce = (json.vout?.[selectedIdx ?? -1] as { nonce?: string } | undefined)?.nonce ?? null;

        const snapshot = { txid: json.txid, vin, vout };
        await ctx.db.chat.update({
          where: { id: input.chatId },
          data: {
            fundingTxSnapshot: snapshot as unknown as object,
            fundingUtxoVout: selectedIdx,
            fundingUtxoValueSats: selectedSats,
            fundingUtxoNonceHex: selectedNonce,
          },
        });

        return {
          ok: true as const,
          txid: json.txid,
          vin,
          vout,
          fundingTxId: chat.fundingTxId,
          selected: selectedIdx === null
            ? null
            : { voutIndex: selectedIdx, valueSats: selectedSats, nonceHex: selectedNonce },
        } as const;
      } catch {
        return { ok: false as const, error: "FETCH_FAILED" as const };
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
        const url = `https://blockstream.info/liquidtestnet/api/tx/${chat.fundingTxId}`;
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) return { ok: false as const, error: "FETCH_FAILED" as const };
        const json = (await res.json()) as unknown as {
          txid: string;
          vin: Array<{ txid: string; vout: number }>;
          vout: Array<{ value?: number; nonce?: string } & Record<string, unknown>>;
        };
        const vin = (json.vin ?? []).map((v) => ({ txid: v.txid, vout: v.vout }));
        const vout = (json.vout ?? []).map((o, idx) => {
          const valueSats = typeof o.value === "number" ? o.value : null;
          const valueBtc = typeof o.value === "number" ? (o.value / 1e8).toFixed(8) : null;
          return { n: idx, valueSats, valueBtc };
        });
        const highlightBtcString = "0.00100000";
        const selected = vout.find((o) => o.valueBtc === highlightBtcString) ?? null;
        const selectedIdx = selected?.n ?? null;
        const selectedSats = selected?.valueSats ?? null;
        const selectedNonce = (json.vout?.[selectedIdx ?? -1] as { nonce?: string } | undefined)?.nonce ?? null;

        const snapshot = { txid: json.txid, vin, vout };
        await ctx.db.chat.update({
          where: { id: input.chatId },
          data: {
            fundingTxSnapshot: snapshot as unknown as object,
            fundingUtxoVout: selectedIdx,
            fundingUtxoValueSats: selectedSats,
            fundingUtxoNonceHex: selectedNonce,
          },
        });

        return {
          ok: true as const,
          txid: json.txid,
          vin,
          vout,
          fundingTxId: chat.fundingTxId,
          selected: selectedIdx === null
            ? null
            : { voutIndex: selectedIdx, valueSats: selectedSats, nonceHex: selectedNonce },
        } as const;
      } catch {
        return { ok: false as const, error: "FETCH_FAILED" as const };
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


