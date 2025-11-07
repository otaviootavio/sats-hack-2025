"use client";
import React, { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import initWasmBindings, { compile_source, compile_source_with_args } from "~/pkg/simplicityhl_wasm.js";
import { api } from "~/trpc/react";

type JsonEntry = { value: string; type: string };
type JsonMap = Record<string, JsonEntry>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonMap(text: string | undefined): JsonMap | null {
  const s = (text ?? "").trim();
  if (!s) return {};
  try {
    const u = JSON.parse(s) as unknown;
    if (!isRecord(u)) return {};
    const out: JsonMap = {};
    for (const [k, v] of Object.entries(u)) {
      if (isRecord(v)) {
        const value = typeof v.value === "string" ? v.value : undefined;
        const type = typeof v.type === "string" ? v.type : undefined;
        if (value !== undefined && type !== undefined) {
          out[k] = { value, type };
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

function getStringProp(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

export default function SignClient({ chatId }: { chatId: string }) {
  const [wasmBindings, setWasmBindings] = useState<unknown>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading WASM...");
  const [statusMessage, setStatusMessage] = useState("");

  const [sig0Hex, setSig0Hex] = useState("");

  // Manual override inputs
  const [utxoTxidInput, setUtxoTxidInput] = useState("");
  const [utxoVoutInput, setUtxoVoutInput] = useState("");
  const [utxoTouched, setUtxoTouched] = useState(false);

  // TRPC
  const utils = api.useUtils();
  const { data: chatData } = api.chat.get.useQuery(
    { chatId },
    { refetchOnWindowFocus: false }
  );
  const { mutate: setActiveMutate } = api.chat.setActive.useMutation();
  const { mutate: updateChatMutate } = api.chat.update.useMutation({
    onSuccess: async () => {
      await utils.chat.get.invalidate({ chatId });
      await utils.chat.list.invalidate();
    },
  });
  const walletQuery = api.chat.getWalletPubkey.useQuery(
    { chatId },
    { refetchOnWindowFocus: false },
  );
  const { mutateAsync: createWalletMutate, isPending: isCreatingWallet } = api.chat.createWallet.useMutation({
    onSuccess: async () => {
      await utils.chat.getWalletPubkey.invalidate({ chatId });
    },
  });
  const { mutateAsync: signPlaceholderMutate, isPending: isSigning } = api.chat.signPlaceholder.useMutation();

  // WASM init
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await initWasmBindings();
        if (!mounted) return;
        setWasmBindings({});
        setLoadingMessage("WASM loaded. Ensure wallet exists, then sign.");
      } catch (e) {
        setLoadingMessage(`Failed to initialize WASM: ${String(e)}`);
      }
    };
    void init();
    return () => { mounted = false; };
  }, []);

  // mark active
  useEffect(() => {
    if (!chatId) return;
    setActiveMutate({ chatId });
  }, [chatId, setActiveMutate]);

  // default UTXO from persisted DB
  useEffect(() => {
    if (!chatData || utxoTouched) return;
    const txid = chatData?.fundingTxId ?? "";
    const vout = chatData?.fundingUtxoVout ?? null;
    if (txid) setUtxoTxidInput(txid);
    if (typeof vout === "number") setUtxoVoutInput(String(vout));
  }, [chatData, utxoTouched]);

  const injectPubkeyIntoArgs = () => {
    const pub = walletQuery.data?.pubHex?.replace(/^0x/i, "");
    if (!pub) return;
    try {
      const argsJson = chatData?.argsJson ?? "";
      const parsed = parseJsonMap(argsJson) ?? {};
      const candidates = ["ALICE_PUBLIC_KEY", "SENDER_PUBKEY", "PUBKEY", "PK"] as const;
      let key = candidates.find((k) => (parsed[k]?.type ?? "").toLowerCase() === "pubkey");
      key ??= "ALICE_PUBLIC_KEY";
      parsed[key] = { value: `0x${pub}`, type: "Pubkey" };
      const s = JSON.stringify(parsed, null, 2);
      updateChatMutate({ chatId, argsJson: s });
      setStatusMessage("Wallet pubkey injected into .args.");
    } catch {}
  };

  const compileProgramBase64 = async (): Promise<string | null> => {
    try {
      const source = (chatData?.source ?? "").trim();
      if (!source) {
        setStatusMessage("No program source found. Go to Code Session first.");
        return null;
      }
      if (!wasmBindings) {
        setStatusMessage("WASM not initialized.");
        return null;
      }
      const debugEnabled = true;
      const argsJson = chatData?.argsJson ?? "";
      const result = argsJson.trim()
        ? compile_source_with_args(source, argsJson, debugEnabled)
        : compile_source(source, debugEnabled);
      const trimmed = (result ?? "").trim();
      if (!trimmed) return null;
      // parse if JSON
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          const program = getStringProp(parsed, "program_base64");
          return program ?? null;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    } catch (e) {
      const errMsg = e instanceof Error ? `${e.message}${e.stack ? "\n" + e.stack : ""}` : String(e);
      setStatusMessage(`Compile failed\n\n${errMsg}`);
      return null;
    }
  };

  const handleSign = async () => {
    try {
      const txidRaw = utxoTouched ? utxoTxidInput : (chatData?.fundingTxId ?? "");
      const txid = (txidRaw ?? "").trim();
      const vout = utxoTouched && utxoVoutInput !== "" ? Number(utxoVoutInput) : chatData?.fundingUtxoVout ?? null;
      if (!txid || typeof vout !== "number" || Number.isNaN(vout)) {
        setStatusMessage("Enter funding txid and vout (or use stored selection).");
        return;
      }
      const pub = walletQuery.data?.pubHex;
      if (!pub) {
        setStatusMessage("Create the per-chat wallet first (click Create/Reset Wallet).");
        return;
      }
      const programBase64 = await compileProgramBase64();
      if (!programBase64) {
        setStatusMessage("Compile failed or returned empty result.");
        return;
      }
      setStatusMessage("Signing...");
      const res = await signPlaceholderMutate({ chatId, txid: txid.toLowerCase(), voutIndex: vout, programBase64 });
      const sigHex = (res as { ok: boolean; sigHex?: string; error?: string }).sigHex;
      if (!sigHex || !(res as { ok: boolean }).ok) {
        setStatusMessage("Signing failed. Ensure wallet exists and try again.");
        return;
      }
      setSig0Hex(sigHex);
      // Inject into .wit JSON and persist
      let nextWitJson = "";
      try {
        const witJson = chatData?.witJson ?? "";
        const current = parseJsonMap(witJson) ?? {};
        const candidates = ["ALICE_SIGNATURE", "SENDER_SIG", "SIG_0"] as const;
        let key = candidates.find((k) => (current[k]?.type ?? "").toLowerCase() === "signature");
        key ??= "SIG_0";
        current[key] = { value: sigHex, type: "Signature" };
        nextWitJson = JSON.stringify(current, null, 2);
      } catch {
        nextWitJson = JSON.stringify({ SIG_0: { value: sigHex, type: "Signature" } }, null, 2);
      }
      updateChatMutate({ chatId, witJson: nextWitJson });
      setStatusMessage("Sig 0 generated (server wallet) and inserted into .wit JSON.");
    } catch (e) {
      setStatusMessage(`Sign failed: ${String(e)}`);
    }
  };

  const hasUtxoForSign = (() => {
    const txidRaw = utxoTouched ? utxoTxidInput : (chatData?.fundingTxId ?? "");
    const txid = (txidRaw ?? "").trim();
    const voutRaw = utxoTouched && utxoVoutInput !== "" ? Number(utxoVoutInput) : chatData?.fundingUtxoVout ?? null;
    return !!txid && typeof voutRaw === "number" && Number.isFinite(voutRaw);
  })();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
          <CardDescription>
            Per-chat server-backed wallet used when compiling and signing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => createWalletMutate({ chatId, reset: true })}
              disabled={isCreatingWallet}
              variant="outline"
              size="sm"
            >
              {walletQuery.data?.pubHex ? "Reset Wallet" : "Create Wallet"}
            </Button>
            <Button
              onClick={injectPubkeyIntoArgs}
              disabled={!walletQuery.data?.pubHex}
              variant="outline"
              size="sm"
            >
              Use pubkey in .args
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={walletQuery.data?.pubHex ?? ""}
              readOnly
              placeholder="Pubkey (x-only) 0x..."
              className="w-full rounded border p-2 text-sm font-mono"
            />
            <input
              value={walletQuery.data?.pubHex ? "Stored on server (encrypted)" : ""}
              readOnly
              placeholder="No wallet yet"
              className="w-full rounded border p-2 text-sm font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funding UTXO</CardTitle>
          <CardDescription>
            Review the stored selection or provide overrides before signing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">Stored selection</div>
            <div className="grid grid-cols-1 gap-3 rounded border p-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-muted-foreground">txid</div>
                <div className="break-all">{chatData?.fundingTxId ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">vout</div>
                <div>{typeof chatData?.fundingUtxoVout === "number" ? chatData.fundingUtxoVout : "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">value (sats)</div>
                <div>{typeof chatData?.fundingUtxoValueSats === "number" ? chatData.fundingUtxoValueSats : "—"}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={utxoTxidInput}
              onChange={(e) => { setUtxoTxidInput(e.target.value); setUtxoTouched(true); }}
              placeholder="Override txid (64 hex)"
              className="w-full rounded border p-2 text-sm font-mono"
            />
            <input
              value={utxoVoutInput}
              onChange={(e) => { setUtxoVoutInput(e.target.value); setUtxoTouched(true); }}
              placeholder="Override vout"
              className="w-full rounded border p-2 text-sm"
            />
            <input
              value={typeof chatData?.fundingUtxoValueSats === "number" ? String(chatData.fundingUtxoValueSats) : ""}
              readOnly
              placeholder="Value (sats) — from DB"
              className="w-full rounded border p-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signature</CardTitle>
          <CardDescription>
            Compile, sign, and capture Sig 0 for this funding transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSign} disabled={!walletQuery.data?.pubHex || !hasUtxoForSign || isSigning} size="sm">
              Sign (Sig 0)
            </Button>
            <Button onClick={async () => { if (!sig0Hex) return; await navigator.clipboard.writeText(sig0Hex); setStatusMessage("Copied Sig 0 to clipboard."); }} disabled={!sig0Hex} variant="outline" size="sm">
              Copy Sig 0
            </Button>
          </div>
          <input
            value={sig0Hex}
            readOnly
            placeholder="Sig 0 (generated via server wallet)"
            className="w-full rounded border p-2 text-sm font-mono"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Progress and debug output from WASM and signing.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">{statusMessage || loadingMessage}</pre>
        </CardContent>
      </Card>
    </div>
  );
}


