"use client";
import React, { useEffect, useState } from "react";
import { PRESETS, type Preset } from "~/app/_utils/presets";
import { liquid_testnet_address_from_source } from "~/pkg/simplicityhl_wasm.js";
import { api } from "~/trpc/react";
import { PresetSelect } from "~/app/playground/_components/PresetSelect";
import { PersistentTextArea } from "~/app/playground/_components/PersistentTextArea";
import { ReadonlyTextArea } from "~/app/playground/_components/ReadonlyTextArea";
import { AddressActions } from "~/app/playground/_components/AddressActions";
import { useWasm } from "~/hooks/useWasm";
import { DebouncedTitleInput } from "~/app/playground/_components/DebouncedTitleInput";

export default function CodeSessionClient({ chatId }: { chatId: string }) {
  const { isInitialized } = useWasm();

  const [selectedExampleValue, setSelectedExampleValue] = useState("");
  const [source, setSource] = useState("");
  const [args, setArgs] = useState("");
  const [address, setAddress] = useState("");
  const [, setStatusMessage] = useState("");

  // tRPC hooks for chats
  const { data: chatData } = api.chat.get.useQuery(
    { chatId },
    { refetchOnWindowFocus: false },
  );
  const updateChat = api.chat.update.useMutation();

  // load chat data
  useEffect(() => {
    if (!chatData) return;
    setSource(chatData.source ?? "");
    setArgs(chatData.argsJson ?? "");
    setAddress(chatData.address ?? "");
  }, [chatData]);

  const applySelection = (v: string) => {
    setSelectedExampleValue(v);
    if (v.startsWith("preset:")) {
      const id = v.slice("preset:".length);
      const p = (PRESETS as Record<string, Preset | undefined>)[id];
      if (p) {
        setSource(p.simf);
        setArgs(p.args);
        // Persist both source and argsJson immediately when preset is selected
        void updateChat.mutateAsync({ chatId, source: p.simf, argsJson: p.args });
        setStatusMessage(`Loaded ${p.label}.`);
        return;
      }
    }
    setSource("");
    setArgs("");
    setStatusMessage(v ? `Loaded example.` : "Cleared editor.");
  };

  const handleGenerateAddress = async () => {
    const code = source.trim();
    if (!code) {
      setStatusMessage("Editor is empty. Paste code or select an example.");
      return;
    }
    if (!isInitialized) {
      setStatusMessage("WASM not initialized.");
      return;
    }
    setStatusMessage("Generating address...");
    try {
      if (typeof liquid_testnet_address_from_source !== "function") {
        setStatusMessage(
          "This build does not expose address helper. Rebuild WASM to enable it.",
        );
        return;
      }
      const maybe = liquid_testnet_address_from_source(
        source,
        args,
        true,
      ) as unknown;
      const addr = await Promise.resolve(maybe as string | Promise<string>);
      if (!addr) {
        setAddress("");
        await updateChat.mutateAsync({ chatId, address: null });
        setStatusMessage("Invalid program");
        return;
      }
      setAddress(addr);
      await updateChat.mutateAsync({ chatId, address: addr });
      setStatusMessage("Success: address derived for Liquid Testnet.");
    } catch (e) {
      setAddress("");
      await updateChat.mutateAsync({ chatId, address: null });
      const errMsg =
        e instanceof Error
          ? `${e.message}${e.stack ? "\n" + e.stack : ""}`
          : String(e);
      setStatusMessage(`Invalid program\n\n${errMsg}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <DebouncedTitleInput
          chatId={chatId}
          initialTitle={chatData?.title ?? ""}
        />

        <PresetSelect
          value={selectedExampleValue}
          options={Object.entries(PRESETS).map(([id, p]) => ({
            value: `preset:${id}`,
            label: p.label,
          }))}
          onChange={(v: string) => {
            applySelection(v);
          }}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onBlur={() => {}}
        />
      </div>
      <div>
        <div className="mb-2">
          <label className="block text-sm font-medium">Args JSON</label>
        </div>
        <PersistentTextArea
          chatId={chatId}
          initialValue={args}
          onChange={(v) => setArgs(v)}
          field="argsJson"
          rows={8}
          placeholder="Paste args JSON here (optional)"
          className="w-full rounded border p-2 font-mono text-sm"
        />
      </div>
      <div>
        <div>
          <label className="block text-sm font-medium">Source</label>
        </div>
        <PersistentTextArea
          chatId={chatId}
          initialValue={source}
          onChange={(v) => setSource(v)}
          rows={16}
          placeholder="Paste SimplicityHL source here"
          className="w-full rounded border p-2 font-mono text-sm"
        />
      </div>

      <AddressActions
        onGenerate={handleGenerateAddress}
        onCopy={async () => {
          if (!address) return;
          await navigator.clipboard.writeText(address);
          setStatusMessage("Copied address to clipboard.");
        }}
        copyDisabled={!address}
      />

      <ReadonlyTextArea
        value={address}
        rows={2}
        className="w-full rounded border p-2 font-mono text-sm"
      />

      <div className="space-y-2">
        <div className="text-muted-foreground text-sm">
          <p>
            The address is a taproot P2TR address on Liquid Testnet created from
            the program&#39;s commitment (CMR) — so identical program text →
            identical address.
          </p>
          <p className="mt-1">
            If the program text has syntax/compile errors, the address call will
            fail and show &quot;Invalid program&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}
