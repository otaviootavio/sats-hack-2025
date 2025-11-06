"use client";
import React, { useEffect, useMemo, useState } from "react";
import initWasmBindings, { liquid_testnet_address_from_source } from "~/pkg/simplicityhl_wasm.js";
import { api } from "~/trpc/react";
import { AddressActions } from "~/app/playground/_components/AddressActions";

type SelectedUtxo = { txid: string; voutIndex: number; valueSats: number } | null;

type FundingVin = { txid: string; vout: number };
type FundingVout = { n: number; valueSats: number | null; valueBtc: string | null };
type FundingSelected = { voutIndex: number; valueSats: number | null; nonceHex: string | null };
type FundingTxOk = {
  ok: true;
  txid: string;
  vin: FundingVin[];
  vout: FundingVout[];
  fundingTxId: string | null;
  selected: FundingSelected | null;
};
type FundingTxErr = { ok: false; error?: string };
type FundingTxResponse = FundingTxOk | FundingTxErr;
type RefetchFundingTxResponse = { ok: boolean };

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in (value as { then?: unknown }) && typeof (value as { then?: unknown }).then === "function";
}

export default function FundingClient({ chatId }: { chatId: string }) {
  const [wasmBindings, setWasmBindings] = useState<unknown>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading WASM...");
  const [statusMessage, setStatusMessage] = useState("");

  const [address, setAddress] = useState("");
  const [fundedUrl, setFundedUrl] = useState("");
  const [fundingTxId, setFundingTxId] = useState("");
  const [selectedUtxo, setSelectedUtxo] = useState<SelectedUtxo>(null);
  const highlightBtcString = useMemo(() => "0.00100000", []);

  // tRPC hooks
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
  const { mutateAsync: requestFundingMutate, isPending: isFunding } = api.chat.requestFunding.useMutation({
    onSuccess: async () => {
      await utils.chat.get.invalidate({ chatId });
      await utils.chat.list.invalidate();
    },
  });
  const fundingTxQuery = api.chat.getFundingTx.useQuery(
    { chatId },
    { enabled: !!fundingTxId, refetchOnWindowFocus: false }
  );
  const { mutateAsync: refetchFundingTxMutate, isPending: isRefetching } = api.chat.refetchFundingTx.useMutation({
    onSuccess: async () => {
      await utils.chat.getFundingTx.invalidate({ chatId });
    },
  });

  const fundingTxDataOk: FundingTxOk | null = fundingTxQuery.data?.ok ? (fundingTxQuery.data as FundingTxOk) : null;

  // WASM init
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const maybe = initWasmBindings();
        const isPromise = typeof (maybe as { then?: unknown }).then === "function";
        const bindings = isPromise ? await (maybe as Promise<unknown>) : maybe;
        if (
          bindings &&
          typeof (bindings as { init?: unknown }).init === "function"
        ) {
          const initFn = (bindings as { init: () => Promise<void> | void }).init;
          await initFn();
        }
        if (!mounted) return;
        setWasmBindings(bindings);
        setLoadingMessage("WASM loaded. Generate the address, then fund it.");
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

  // load persisted funding data and derive address if possible
  useEffect(() => {
    if (!chatData) return;
    setFundedUrl((chatData as unknown as { faucetUrl?: string }).faucetUrl ?? "");
    setFundingTxId((chatData as unknown as { fundingTxId?: string }).fundingTxId ?? "");

    const source = (chatData as unknown as { source?: string }).source ?? "";
    if (source && wasmBindings) {
      void (async () => {
        try {
          if (typeof liquid_testnet_address_from_source !== "function") {
            setStatusMessage("This build does not expose address helper.");
            return;
          }
          const maybe = liquid_testnet_address_from_source(source, "", true) as unknown;
          let addr: string | undefined;
          if (isPromiseLike<string>(maybe)) {
            addr = await maybe;
          } else {
            addr = maybe as string;
          }
          if (addr) setAddress(addr);
          else setStatusMessage("Invalid program");
        } catch (e) {
          const errMsg = e instanceof Error ? `${e.message}${e.stack ? "\n" + e.stack : ""}` : String(e);
          setStatusMessage(`Invalid program\n\n${errMsg}`);
        }
      })();
    }
  }, [chatData, wasmBindings]);

  // select server-provided utxo when tx loads
  useEffect(() => {
    if (!fundingTxId || !fundingTxQuery.data?.ok) {
      setSelectedUtxo(null);
      return;
    }
    const data = fundingTxQuery.data as FundingTxOk;
    const selected = data.selected;
    if (selected && typeof selected.voutIndex === "number") {
      const sats = typeof selected.valueSats === "number" ? selected.valueSats : Math.round(parseFloat(highlightBtcString) * 1e8);
      setSelectedUtxo({ txid: fundingTxId, voutIndex: selected.voutIndex, valueSats: sats });
      return;
    }
    const voutItems: FundingVout[] = data.vout ?? [];
    const match = voutItems.find((o) => o.valueBtc === highlightBtcString);
    if (match && typeof match.n === "number") {
      const sats = typeof match.valueSats === "number" ? match.valueSats : Math.round(parseFloat(highlightBtcString) * 1e8);
      setSelectedUtxo({ txid: fundingTxId, voutIndex: match.n, valueSats: sats });
    } else {
      setSelectedUtxo(null);
    }
  }, [fundingTxQuery.data, fundingTxId, highlightBtcString]);

  const handleGenerateAddress = async () => {
    try {
      const source = (chatData as unknown as { source?: string }).source ?? "";
      if (!source) {
        setStatusMessage("No program source found. Go to Code Session first.");
        return;
      }
      if (!wasmBindings) {
        setStatusMessage("WASM not initialized.");
        return;
      }
      setStatusMessage("Generating address...");
      const maybe = liquid_testnet_address_from_source(source, "", true) as unknown;
      let addr: string | undefined;
      if (isPromiseLike<string>(maybe)) {
        addr = await maybe;
      } else {
        addr = maybe as string;
      }
      if (!addr) {
        setAddress("");
        setStatusMessage("Invalid program");
        return;
      }
      setAddress(addr);
      setStatusMessage("Success: address derived for Liquid Testnet.");
    } catch (e) {
      setAddress("");
      const errMsg = e instanceof Error ? `${e.message}${e.stack ? "\n" + e.stack : ""}` : String(e);
      setStatusMessage(`Invalid program\n\n${errMsg}`);
    }
  };

  const handleFundAddress = () => {
    if (!address) return;
    const url = `https://liquidtestnet.com/faucet?address=${encodeURIComponent(address)}&action=lbtc`;
    setStatusMessage("Requesting funding from faucet...");
    setFundedUrl(url);
    updateChatMutate({ chatId, faucetUrl: url });
    void requestFundingMutate({ chatId })
      .then((res) => {
        const tx = (res as { fundingTxId?: string } | undefined)?.fundingTxId;
        if (tx) {
          setFundingTxId(tx);
          setStatusMessage(`Funding requested. Transaction: ${tx}. You can open details below.`);
        } else {
          setFundingTxId("");
          setStatusMessage("Funding requested but we could not fetch the funding transaction.");
        }
      })
      .catch(() => {
        setFundingTxId("");
        setStatusMessage("Funding requested but we could not fetch the funding transaction.");
      });
  };

  const handleRetryFetchFunding = async () => {
    if (!fundedUrl && !address) return;
    try {
      // If there is no persisted faucet URL yet, compute and persist it now.
      if (!fundedUrl && address) {
        const url = `https://liquidtestnet.com/faucet?address=${encodeURIComponent(address)}&action=lbtc`;
        updateChatMutate({ chatId, faucetUrl: url });
        setFundedUrl(url);
      }
      setStatusMessage("Retrying to fetch funding transaction id from faucet...");
      const res = await requestFundingMutate({ chatId });
      const tx = (res as { fundingTxId?: string } | undefined)?.fundingTxId;
      if (tx) {
        setFundingTxId(tx);
        setStatusMessage(`Success: funding transaction id ${tx}.`);
      } else {
        setFundingTxId("");
        setStatusMessage("We could not fetch the funding transaction. Please try again later.");
      }
    } catch {
      setFundingTxId("");
      setStatusMessage("We could not fetch the funding transaction. Please try again later.");
    }
  };

  const handleRefetchFundingTx = async () => {
    if (!fundingTxId) return;
    try {
      setStatusMessage("Refreshing transaction details from Blockstream...");
      const res = (await refetchFundingTxMutate({ chatId })) as RefetchFundingTxResponse;
      if (res.ok) {
        setStatusMessage("Transaction details refreshed.");
      } else {
        setStatusMessage("Failed to refresh transaction details.");
      }
    } catch {
      setStatusMessage("Failed to refresh transaction details.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <strong>Address</strong>
        <span className="text-xs text-muted-foreground">Derived from the program&apos;s CMR. Faucet sends 100000 tL-BTC.</span>
      </div>
      <AddressActions
        onGenerate={handleGenerateAddress}
        onCopy={async () => { if (!address) return; await navigator.clipboard.writeText(address); setStatusMessage("Copied address to clipboard."); }}
        copyDisabled={!address}
      />
      <textarea value={address} readOnly rows={2} className="w-full rounded border p-2 font-mono text-sm" />

      <label className="block text-sm font-medium">Funding</label>
      {!address && (
        <p className="text-muted-foreground text-sm">Generate the address in order to fund the wallet.</p>
      )}
      {address && !fundedUrl && (
        <div className="flex items-center gap-2">
          <button onClick={handleFundAddress} className="btn rounded border px-3 py-1">Fund the wallet</button>
        </div>
      )}
      {fundedUrl && (
        <div className="flex items-center gap-2">
          <a href={fundedUrl} target="_blank" rel="noopener noreferrer" className="btn rounded border px-3 py-1">Click here to see details</a>
        </div>
      )}
      {fundedUrl && fundingTxId && (
        <div className="mt-2 text-sm">
          <span className="font-medium">Funding transaction:</span> {fundingTxId}
        </div>
      )}
      {fundedUrl && !fundingTxId && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>we could not fetch the funding transaction</span>
          <button onClick={handleRetryFetchFunding} disabled={isFunding} title="Retry" className="btn rounded border px-2 py-1">↻</button>
        </div>
      )}

      {fundingTxId && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium flex items-center gap-2">
            <span>Transaction details</span>
            <button onClick={handleRefetchFundingTx} disabled={isRefetching} title="Refresh" className="btn rounded border px-2 py-1">↻</button>
          </div>
          {!fundingTxQuery.data && fundingTxQuery.isLoading && (
            <div className="text-sm text-muted-foreground">Loading transaction...</div>
          )}
          {fundingTxQuery.error && (
            <div className="text-sm text-red-600">Failed to load transaction details.</div>
          )}
          {fundingTxQuery.data?.ok && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-medium mb-1">Inputs</div>
                <ul className="space-y-1 text-sm">
                  {(fundingTxDataOk?.vin ?? []).map((vinItem, idx) => (
                    <li key={`vin-${idx}`} className="rounded border px-2 py-1">
                      <div className="break-all">{vinItem.txid}</div>
                      <div className="text-muted-foreground">index: {vinItem.vout}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Outputs</div>
                <ul className="space-y-1 text-sm">
                  {(fundingTxDataOk?.vout ?? []).map((voutItem) => {
                    const isHighlight = voutItem.valueBtc === highlightBtcString;
                    return (
                      <li key={`vout-${voutItem.n}`} className={`rounded border px-2 py-1 ${isHighlight ? "bg-yellow-100" : ""}`}>
                        <div className="break-all">{fundingTxId}</div>
                        <div className="text-muted-foreground">index: {voutItem.n}</div>
                        {typeof voutItem.valueBtc === "string" && (
                          <div className="text-muted-foreground">value: {voutItem.valueBtc}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="sm:col-span-2">
                {selectedUtxo && (
                  <div className="mt-2 rounded border p-3">
                    <div className="mb-1 text-sm font-medium">Selected UTXO</div>
                    <div className="text-sm">
                      <div><span className="font-medium">txid:</span> <span className="break-all">{selectedUtxo.txid}</span></div>
                      <div><span className="font-medium">vout index:</span> {selectedUtxo.voutIndex}</div>
                      <div><span className="font-medium">value (sats):</span> {selectedUtxo.valueSats}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <pre className="rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">{statusMessage || loadingMessage}</pre>

      <div className="flex gap-4 text-sm">
        <a href={`/playground/${chatId}`} className="underline">Back to full playground</a>
        <a href={`/playground/${chatId}/code`} className="underline">Go to Code Session</a>
      </div>
    </div>
  );
}


