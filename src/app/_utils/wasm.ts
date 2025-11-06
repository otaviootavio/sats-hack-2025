import * as wasm from '~/pkg/simplicityhl_wasm.js';

export function initWasmBindings() {
  const init = (wasm as any).default as (input?: any) => Promise<any>
  const compile_source = (wasm as any).compile_source as (code: string, include_debug: boolean) => Promise<string>
  const compile_source_with_args: any = (wasm as any).compile_source_with_args
  const compile_and_satisfy: any = (wasm as any).compile_and_satisfy
  const liquid_testnet_address_from_source: any = (wasm as any).liquid_testnet_address_from_source
  return { init, compile_source, compile_source_with_args, compile_and_satisfy, liquid_testnet_address_from_source }
}


