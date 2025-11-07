import React from 'react'
import { Button } from '~/components/ui/button'

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
      <Button onClick={onCopyProgram} disabled={!!disableProgram} variant="outline" size="sm">Copy Program</Button>
      <Button onClick={onCopyWitness} disabled={!!disableWitness} variant="outline" size="sm">Copy Witness</Button>
      <Button onClick={onDownloadJson} disabled={!!disableProgram} variant="outline" size="sm">Download JSON</Button>
    </div>
  )
}
