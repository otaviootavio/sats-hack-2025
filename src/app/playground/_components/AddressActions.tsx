import React from 'react'

export function AddressActions({
  onGenerate,
  onCopy,
  copyDisabled,
}: {
  onGenerate: () => void
  onCopy: () => void
  copyDisabled?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
      <div className="flex gap-2 items-center">
        <strong>Address</strong>
        <span className="text-xs text-muted-foreground">Derives a Liquid Testnet P2TR address from the program’s CMR. Generate the address to fund it on testnet!</span>
      </div>
      <div className="flex gap-2 mt-2 sm:mt-0">
        <button onClick={onGenerate} className="btn border px-3 py-1 rounded">Generate Address</button>
        <button onClick={onCopy} disabled={!!copyDisabled} className="btn border px-3 py-1 rounded">Copy Address</button>
      </div>
    </div>
  )
}
