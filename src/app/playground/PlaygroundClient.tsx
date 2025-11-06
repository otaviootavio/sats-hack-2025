'use client'
import React, { useEffect, useState } from 'react'
import { PRESETS } from '~/app/_utils/presets'
import initWasmBindings, { compile_and_satisfy, compile_source, compile_source_with_args, liquid_testnet_address_from_source } from '~/pkg/simplicityhl_wasm.js'

type LastResult = { program_base64: string; witness_base64?: string } | null

export default function PlaygroundClient() {
  const [wasmBindings, setWasmBindings] = useState<any | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Loading WASM...')

  const [source, setSource] = useState('')
  const [argsJson, setArgsJson] = useState('')
  const [witJson, setWitJson] = useState('')
  const [address, setAddress] = useState('')
  const [outputMessage, setOutputMessage] = useState('')
  const [lastResult, setLastResult] = useState<LastResult>(null)
  const [selectedExampleValue, setSelectedExampleValue] = useState('')

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        // initWasmBindings may return either the bindings directly or a Promise that
        // resolves to the bindings. Handle both shapes to be robust.
        const maybe = initWasmBindings()
        const bindings = maybe && typeof (maybe as any).then === 'function' ? await maybe : maybe
        // Older builds might expose an `init` method on the bindings; call it if present.
        if (bindings && typeof (bindings as any).init === 'function') {
          await (bindings as any).init()
        }
        if (!mounted) return
        setWasmBindings(bindings)
        setLoadingMessage('WASM loaded. Choose an example or paste code, then click Compile.')
      } catch (e) {
        setLoadingMessage(`Failed to initialize WASM: ${String(e)}`)
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => setOutputMessage(loadingMessage), [loadingMessage])

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setSelectedExampleValue(v)
    if (v.startsWith('preset:')) {
      const id = v.slice('preset:'.length)
      const p = (PRESETS as any)[id]
      if (p) {
        setSource(p.simf)
        setArgsJson(p.args)
        setWitJson(p.wit)
        setOutputMessage(`Loaded ${p.label} (ready to Compile + Witness).`)
        return
      }
    }
    setOutputMessage(v ? `Loaded example.` : 'Cleared editor.')
  }

  const updateLastResultState = (v: LastResult) => {
    setLastResult(v)
  }

  const handleCompile = async (withWitness = false) => {
    const code = source.trim()
    if (!code) {
      setOutputMessage('Editor is empty. Paste code or select an example.')
      return
    }
    if (!wasmBindings) {
      setOutputMessage('WASM not initialized.')
      return
    }
    const debugEnabled = true
    setOutputMessage(withWitness ? 'Compiling and satisfying...' : 'Compiling...')
    try {
      if (withWitness) {
        const wit = witJson.trim()
        if (!wit) {
          setOutputMessage('Provide .wit JSON to use Compile + Witness.')
          return
        }
        if (typeof compile_and_satisfy !== 'function') {
          setOutputMessage('This build does not support witness in the browser. Rebuild WASM to enable it.')
          return
        }
        const jsonStr = await compile_and_satisfy(
          code,
          argsJson || '',
          wit,
          debugEnabled
        )
        const obj = JSON.parse(jsonStr) as { program_base64: string; witness_base64?: string }
        updateLastResultState(obj)
        setOutputMessage('Success: program and witness base64 copied to the text boxes.')
        return
      }

      // Compile-only path
      let result = ''
      if (argsJson.trim()) {
        result = await compile_source_with_args(code, argsJson, debugEnabled)
      } else {
        result = await compile_source(code, debugEnabled)
      }
      // Try to parse JSON; if not JSON, assume the function returned the program base64 directly
      let programBase64 = ''
      const trimmed = (result || '').trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed) as any
          programBase64 = parsed?.program_base64 ?? ''
        } catch {
          programBase64 = trimmed
        }
      } else {
        programBase64 = trimmed
      }
      if (!programBase64) {
        setOutputMessage('Compile returned empty result.')
        updateLastResultState(null)
        return
      }
      updateLastResultState({ program_base64: programBase64 })
      setOutputMessage('Success: program base64 copied to the text boxes.')
    } catch (e) {
      updateLastResultState(null)
      const errMsg = e instanceof Error ? `${e.message}${e.stack ? '\n' + e.stack : ''}` : String(e)
      setOutputMessage(`Error:\n\n${errMsg}`)
    }
  }

  const handleGenerateAddress = async () => {
    const code = source.trim()
    if (!code) {
      setOutputMessage('Editor is empty. Paste code or select an example.')
      return
    }
    if (!wasmBindings) {
      setOutputMessage('WASM not initialized.')
      return
    }
    if (typeof wasmBindings.liquid_testnet_address_from_source !== 'function') {
      setOutputMessage('This build does not support address generation in the browser. Rebuild WASM to enable it.')
      return
    }
    setOutputMessage('Generating address...')
    try {
      // call the exported wrapper function directly (it uses the initialized `wasm` under the hood)
      if (typeof liquid_testnet_address_from_source !== 'function') {
        setOutputMessage('This build does not expose address helper. Rebuild WASM to enable it.')
        return
      }
      const maybe = liquid_testnet_address_from_source(source, argsJson || '', true)
      const addr = maybe && typeof (maybe as any).then === 'function'
        ? await (maybe as unknown as Promise<string>)
        : (maybe as unknown as string)
      // debug: if empty string, show a helpful message
      if (!addr) {
        setAddress('')
        setOutputMessage('Address generation returned empty result.')
        return
      }
      setAddress(addr)
      setOutputMessage('Success: address derived for Liquid Testnet.')
    } catch (e) {
      setAddress('')
      const errMsg = e instanceof Error ? `${e.message}${e.stack ? '\n' + e.stack : ''}` : String(e)
      setOutputMessage(`Error:\n\n${errMsg}`)
    }
  }

  const handleCopy = async (what: 'program' | 'witness' | 'address') => {
    try {
      if (what === 'address') {
        if (!address) return
        await navigator.clipboard.writeText(address)
        setOutputMessage('Copied address to clipboard.')
        return
      }
      const last = lastResult
      if (!last) return
      const value = what === 'program' ? last.program_base64 : last.witness_base64
      if (!value) return
      await navigator.clipboard.writeText(value)
      setOutputMessage(`Copied ${what} base64 to clipboard.`)
    } catch (e) {
      setOutputMessage(`Copy failed: ${String(e)}`)
    }
  }

  const handleDownloadJson = () => {
    const last = lastResult
    if (!last?.program_base64) return
    const blob = new Blob([JSON.stringify(last, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = last.witness_base64 ? 'simplicity-program-with-witness.json' : 'simplicity-program.json'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm">Example:</span>
          <select
            onChange={handlePresetChange}
            value={selectedExampleValue}
            className="border rounded px-2 py-1"
          >
            <option value="">-- none --</option>
            <optgroup label="Repository examples">
              {Object.entries(PRESETS).map(([id, p]) => (
                <option key={id} value={`preset:${id}`}>
                  {(p as any).label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <div className="flex gap-2 mt-3 sm:mt-0">
          <button onClick={() => handleCompile(false)} className="btn bg-sky-600 text-white px-3 py-1 rounded">Compile</button>
          <button onClick={() => handleCompile(true)} className="btn border px-3 py-1 rounded">Compile + Witness</button>
        </div>
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={16}
        className="w-full font-mono text-sm border rounded p-2"
        placeholder="Paste SimplicityHL source here"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">.args (JSON) — optional</label>
          <textarea
            value={argsJson}
            onChange={(e) => setArgsJson(e.target.value)}
            rows={10}
            className="w-full font-mono text-sm border rounded p-2"
            placeholder={`{\n  "ALICE_PUBLIC_KEY": { "value": "0x...", "type": "Pubkey" }\n}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">.wit (JSON) — required for Compile + Witness</label>
          <textarea
            value={witJson}
            onChange={(e) => setWitJson(e.target.value)}
            rows={10}
            className="w-full font-mono text-sm border rounded p-2"
            placeholder={`{\n  "ALICE_SIGNATURE": { "value": "0x...", "type": "Signature" }\n}`}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <div className="flex gap-2 items-center">
          <strong>Address</strong>
          <span className="text-xs text-muted-foreground">Derives a Liquid Testnet P2TR address from the program’s CMR.</span>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button onClick={handleGenerateAddress} className="btn border px-3 py-1 rounded">Generate Address</button>
          <button onClick={() => handleCopy('address')} disabled={!address} className="btn border px-3 py-1 rounded">Copy Address</button>
        </div>
      </div>

      <textarea value={address} readOnly rows={2} className="w-full font-mono text-sm border rounded p-2" />

      <div className="flex gap-2 items-center">
        <strong>Output</strong>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => handleCopy('program')} disabled={!lastResult?.program_base64} className="btn border px-3 py-1 rounded">Copy Program</button>
          <button onClick={() => handleCopy('witness')} disabled={!lastResult?.witness_base64} className="btn border px-3 py-1 rounded">Copy Witness</button>
          <button onClick={handleDownloadJson} disabled={!lastResult?.program_base64} className="btn border px-3 py-1 rounded">Download JSON</button>
        </div>
      </div>

      <label className="block text-sm font-medium">Program (base64)</label>
      <textarea value={lastResult?.program_base64 ?? ''} readOnly rows={6} className="w-full font-mono text-sm border rounded p-2" />

      <label className="block text-sm font-medium">Witness (base64)</label>
      <textarea value={lastResult?.witness_base64 ?? ''} readOnly rows={6} className="w-full font-mono text-sm border rounded p-2" />

      <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded text-sm">{outputMessage || loadingMessage}</pre>
    </div>
  )
}


