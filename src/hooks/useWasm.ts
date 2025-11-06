import { useState, useEffect } from "react";
import initWasmBindings from "~/pkg/simplicityhl_wasm.js";

interface UseWasmState {
  isInitialized: boolean;
  isLoading: boolean;
  statusMessage: string;
  error: string | null;
}

export function useWasm(): UseWasmState {
  const [state, setState] = useState<UseWasmState>({
    isInitialized: false,
    isLoading: true,
    statusMessage: "Loading WASM...",
    error: null,
  });

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

        setState({
          isInitialized: true,
          isLoading: false,
          statusMessage: "WASM loaded. Write code, then click Generate Address.",
          error: null,
        });
      } catch (e) {
        const errorMessage = `Failed to initialize WASM: ${String(e)}`;
        if (mounted) {
          setState({
            isInitialized: false,
            isLoading: false,
            statusMessage: errorMessage,
            error: errorMessage,
          });
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
