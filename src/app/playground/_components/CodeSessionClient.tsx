"use client";
import React, { useEffect, useState } from "react";
import { PRESETS, type Preset } from "~/app/_utils/presets";
import { liquid_testnet_address_from_source } from "~/pkg/simplicityhl_wasm.js";
import { api } from "~/trpc/react";
import { PresetSelect } from "~/app/playground/_components/PresetSelect";
import { PersistentTextArea } from "~/app/playground/_components/PersistentTextArea";
import { ReadonlyTextArea } from "~/app/playground/_components/ReadonlyTextArea";
import { useWasm } from "~/hooks/useWasm";
import { DebouncedTitleInput } from "~/app/playground/_components/DebouncedTitleInput";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";

export default function CodeSessionClient({ chatId }: { chatId: string }) {
  const { isInitialized } = useWasm();
  const router = useRouter();

  const [selectedExampleValue, setSelectedExampleValue] = useState("");
  const [source, setSource] = useState("");
  const [args, setArgs] = useState("");
  const [address, setAddress] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState<"default" | "destructive">(
    "default",
  );

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
        void updateChat.mutateAsync({
          chatId,
          source: p.simf,
          argsJson: p.args,
        });
        setStatusMessage(`Loaded ${p.label}.`);
        setStatusVariant("default");
        return;
      }
    }
    setSource("");
    setArgs("");
    setStatusMessage(v ? `Loaded example.` : "Cleared editor.");
    setStatusVariant("default");
  };

  const handleGenerateAddress = async () => {
    const code = source.trim();
    if (!code) {
      setStatusMessage("Editor is empty. Paste code or select an example.");
      setStatusVariant("destructive");
      return;
    }
    if (!isInitialized) {
      setStatusMessage("WASM not initialized.");
      setStatusVariant("destructive");
      return;
    }
    setStatusMessage("Generating address...");
    setStatusVariant("default");
    try {
      if (typeof liquid_testnet_address_from_source !== "function") {
        setStatusMessage(
          "This build does not expose address helper. Rebuild WASM to enable it.",
        );
        setStatusVariant("destructive");
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
        setStatusVariant("destructive");
        return;
      }
      setAddress(addr);
      await updateChat.mutateAsync({ chatId, address: addr });
      setStatusMessage("Success: address derived for Liquid Testnet.");
      setStatusVariant("default");
    } catch (e) {
      setAddress("");
      await updateChat.mutateAsync({ chatId, address: null });
      const errMsg =
        e instanceof Error
          ? `${e.message}${e.stack ? "\n" + e.stack : ""}`
          : String(e);
      setStatusMessage(`Invalid program\n\n${errMsg}`);
      setStatusVariant("destructive");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>
            Rename your session and load a preset program to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Args JSON</CardTitle>
          <CardDescription>
            Optional runtime arguments saved with this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersistentTextArea
            chatId={chatId}
            initialValue={args}
            onChange={(v) => setArgs(v)}
            field="argsJson"
            rows={8}
            placeholder="Paste args JSON here (optional)"
            className="w-full rounded border p-2 font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source</CardTitle>
          <CardDescription>
            Paste or edit your SimplicityHL source code. Changes auto-save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersistentTextArea
            chatId={chatId}
            initialValue={source}
            onChange={(v) => setSource(v)}
            rows={16}
            placeholder="Paste SimplicityHL source here"
            className="w-full rounded border p-2 font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derived Address</CardTitle>
          <CardDescription>
            Generate the Liquid Testnet taproot address for this program and
            continue to funding when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusMessage && (
            <Alert variant={statusVariant}>
              <AlertTitle>
                {statusVariant === "destructive" ? "Compilation error" : "Status"}
              </AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap font-mono text-xs">{statusMessage}</pre>
              </AlertDescription>
            </Alert>
          )}
          <ReadonlyTextArea
            value={address}
            rows={2}
            className="w-full rounded border p-2 font-mono text-sm"
          />
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              The address is derived from the program&#39;s commitment (CMR).
              Identical program text always yields the same address.
            </p>
            <p>
              If the program has syntax or compile errors, address generation
              fails and reports &quot;Invalid program&quot;.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={handleGenerateAddress}
            variant="outline"
            size="sm"
          >
            Generate Address
          </Button>
          {address && (
            <Button
              onClick={() => router.push(`/playground/${chatId}/funding`)}
              size="lg"
              className="bg-green-500 font-bold text-white shadow-lg shadow-green-400/60 transition-all hover:bg-green-600 hover:shadow-xl hover:shadow-green-400/80 hover:scale-110"
            >
              Fund Address
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
