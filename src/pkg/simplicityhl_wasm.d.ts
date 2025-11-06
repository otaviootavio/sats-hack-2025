/* tslint:disable */
/* eslint-disable */
/**
* @param {string} program
* @param {boolean} include_debug
* @returns {string}
*/
export function compile_source(program: string, include_debug: boolean): string;
/**
* @param {boolean} include_debug
* @returns {string}
*/
export function compile_hardcoded_ok(include_debug: boolean): string;
/**
* @param {boolean} include_debug
* @returns {string}
*/
export function compile_hardcoded_err(include_debug: boolean): string;
/**
* @param {string} program
* @param {string} args_json
* @param {boolean} include_debug
* @returns {string}
*/
export function compile_source_with_args(program: string, args_json: string, include_debug: boolean): string;
/**
* @param {string} program
* @param {string} args_json
* @param {string} wit_json
* @param {boolean} include_debug
* @returns {string}
*/
export function compile_and_satisfy(program: string, args_json: string, wit_json: string, include_debug: boolean): string;
/**
* @param {string} program
* @param {string} args_json
* @param {boolean} include_debug
* @returns {string}
*/
export function liquid_testnet_address_from_source(program: string, args_json: string, include_debug: boolean): string;
/**
* @param {string} cmr_hex
* @returns {string}
*/
export function liquid_testnet_address_from_cmr_hex(cmr_hex: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly compile_source: (a: number, b: number, c: number, d: number) => void;
  readonly compile_hardcoded_ok: (a: number, b: number) => void;
  readonly compile_hardcoded_err: (a: number, b: number) => void;
  readonly compile_source_with_args: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly compile_and_satisfy: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly liquid_testnet_address_from_source: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly liquid_testnet_address_from_cmr_hex: (a: number, b: number, c: number) => void;
  readonly rust_0_5_malloc: (a: number) => number;
  readonly rust_0_5_calloc: (a: number, b: number) => number;
  readonly rust_0_5_free: (a: number) => void;
  readonly rustsecp256k1zkp_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1zkp_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
