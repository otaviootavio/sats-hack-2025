import React from 'react'
import { Button } from '~/components/ui/button'

export function CompileButtons({
  onCompile,
  onCompileWithWitness,
}: {
  onCompile: () => void
  onCompileWithWitness: () => void
}) {
  return (
    <div className="flex gap-2 mt-3 sm:mt-0">
      <Button onClick={onCompile} size="sm">Compile</Button>
      <Button onClick={onCompileWithWitness} variant="outline" size="sm">Compile + Witness</Button>
    </div>
  )
}
