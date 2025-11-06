"use client";
import React, { useEffect, useRef, useState } from "react";
import { PRESETS, type Preset } from "~/app/_utils/presets";
import initWasmBindings, {
  liquid_testnet_address_from_source,
} from "~/pkg/simplicityhl_wasm.js";
import { api } from "~/trpc/react";
import { TitleInput } from "~/app/playground/_components/TitleInput";
import { PresetSelect } from "~/app/playground/_components/PresetSelect";
import { EditorTextArea } from "~/app/playground/_components/EditorTextArea";
import { ReadonlyTextArea } from "~/app/playground/_components/ReadonlyTextArea";
import { AddressActions } from "~/app/playground/_components/AddressActions";

export default function CodeSessionClient({ chatId }: { chatId: string }) {
  const [wasmBindings, setWasmBindings] = useState<unknown>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading WASM...");

  const [title, setTitle] = useState("");
  const [selectedExampleValue, setSelectedExampleValue] = useState("");
  const [source, setSource] = useState("");
  const [address, setAddress] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // refs for debounced autosave
  const dirtyRef = useRef(false);
  const titleRef = useRef(title);
  const selectedExampleValueRef = useRef(selectedExampleValue);
  const sourceRef = useRef(source);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { selectedExampleValueRef.current = selectedExampleValue; }, [selectedExampleValue]);
  useEffect(() => { sourceRef.current = source; }, [source]);

  // tRPC hooks for chats
  const utils = api.useUtils();
  const { data: chatData } = api.chat.get.useQuery(
    { chatId },
    { refetchOnWindowFocus: false }
  );
  const { mutate: setActiveMutate } = api.chat.setActive.useMutation();
  const { mutate: updateChatMutate } = api.chat.update.useMutation({
    onSuccess: async () => {
      dirtyRef.current = false;
      await utils.chat.get.invalidate({ chatId });
      await utils.chat.list.invalidate();
    },
  });

  // WASM init (robust against sync/async exports and optional init())
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
        setLoadingMessage(
          "WASM loaded. Write code, then click Generate Address."
        );
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

  // load chat data
  useEffect(() => {
    if (!chatData) return;
    setTitle(chatData.title ?? "");
    setSelectedExampleValue(chatData.selectedExampleValue ?? "");
    setSource(chatData.source ?? "");
  }, [chatData]);

  // Debounced autosave
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSaveDebounced = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!dirtyRef.current) return;
      updateChatMutate({
        chatId,
        title: titleRef.current,
        selectedExampleValue: selectedExampleValueRef.current ?? null,
        source: sourceRef.current,
      });
    }, 600);
  }, [updateChatMutate, chatId]);

  const flushSaveIfDirty = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!dirtyRef.current) return;
    updateChatMutate({
      chatId,
      title: titleRef.current,
      selectedExampleValue: selectedExampleValueRef.current ?? null,
      source: sourceRef.current,
    });
  }, [updateChatMutate, chatId]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const applySelection = (v: string) => {
    setSelectedExampleValue(v);
    if (v.startsWith("preset:")) {
      const id = v.slice("preset:".length);
      const p = (PRESETS as Record<string, Preset | undefined>)[id];
      if (p) {
        setSource(p.simf);
        setStatusMessage(`Loaded ${p.label}.`);
        setTitle((prev) => {
          const t = (prev ?? "").trim();
          if (t === "" || t.toLowerCase() === "untitled") {
            return p.label;
          }
          return prev;
        });
        return;
      }
    }
    setSource("");
    setStatusMessage(v ? `Loaded example.` : "Cleared editor.");
  };

  const handleGenerateAddress = async () => {
    const code = source.trim();
    if (!code) {
      setStatusMessage("Editor is empty. Paste code or select an example.");
      return;
    }
    if (!wasmBindings) {
      setStatusMessage("WASM not initialized.");
      return;
    }
    setStatusMessage("Generating address...");
    try {
      if (typeof liquid_testnet_address_from_source !== "function") {
        setStatusMessage("This build does not expose address helper. Rebuild WASM to enable it.");
        return;
      }
      const maybe = liquid_testnet_address_from_source(source, "", true) as unknown;
      const addr = await Promise.resolve(maybe as string | Promise<string>);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <TitleInput
          value={title}
          onChange={(v) => {
            setTitle(v);
            dirtyRef.current = true;
            scheduleSaveDebounced();
          }}
          onBlur={flushSaveIfDirty}
        />

        <PresetSelect
          value={selectedExampleValue}
          options={Object.entries(PRESETS).map(([id, p]) => ({ value: `preset:${id}`, label: p.label }))}
          onChange={(v) => {
            applySelection(v);
            dirtyRef.current = true;
            scheduleSaveDebounced();
          }}
          onBlur={flushSaveIfDirty}
        />
      </div>

      <EditorTextArea
        value={source}
        onChange={(v) => {
          setSource(v);
          dirtyRef.current = true;
          scheduleSaveDebounced();
        }}
        onBlur={flushSaveIfDirty}
        rows={16}
        placeholder="Paste SimplicityHL source here"
        className="w-full rounded border p-2 font-mono text-sm"
      />

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <p>
            The address is a taproot P2TR address on Liquid Testnet created from the program&#39;s
            commitment (CMR) — so identical program text → identical address; witness values do not
            change that address.
          </p>
          <p className="mt-1">
            The compile step runs automatically when the UI needs the CMR (you don&#39;t press a
            separate &quot;compile&quot; button). The address is derived from the compiled program (the CMR) —
            witness values are not involved.
          </p>
          <p className="mt-1">
            If the program text has syntax/compile errors, the address call will fail and show
            &quot;Invalid program&quot;.
          </p>
        </div>
      </div>

      <AddressActions
        onGenerate={handleGenerateAddress}
        onCopy={async () => { if (!address) return; await navigator.clipboard.writeText(address); setStatusMessage("Copied address to clipboard."); }}
        copyDisabled={!address}
      />

      <ReadonlyTextArea
        value={address}
        rows={2}
        className="w-full rounded border p-2 font-mono text-sm"
      />

      <pre className="rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">{statusMessage || loadingMessage}</pre>

      <div>
        <a href={`/playground/${chatId}`} className="text-sm underline">Back to full playground</a>
      </div>
    </div>
  );
}


