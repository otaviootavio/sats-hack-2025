import React from 'react'

export function OutputHeaderActions({
  onCopyProgram,
  onCopyWitness,
  onDownloadJson,
  disableProgram,
  disableWitness,
}: {
  onCopyProgram: () => void
  onCopyWitness: () => void
  onDownloadJson: () => void
  disableProgram?: boolean
  disableWitness?: boolean
}) {
  return (
    <div className="flex gap-2 ml-auto">
      <button onClick={onCopyProgram} disabled={!!disableProgram} className="btn border px-3 py-1 rounded">Copy Program</button>
      <button onClick={onCopyWitness} disabled={!!disableWitness} className="btn border px-3 py-1 rounded">Copy Witness</button>
      <button onClick={onDownloadJson} disabled={!!disableProgram} className="btn border px-3 py-1 rounded">Download JSON</button>
    </div>
  )
}
