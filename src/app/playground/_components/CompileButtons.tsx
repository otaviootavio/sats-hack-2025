import React from 'react'

export function CompileButtons({
  onCompile,
  onCompileWithWitness,
}: {
  onCompile: () => void
  onCompileWithWitness: () => void
}) {
  return (
    <div className="flex gap-2 mt-3 sm:mt-0">
      <button onClick={onCompile} className="btn bg-sky-600 text-white px-3 py-1 rounded">Compile</button>
      <button onClick={onCompileWithWitness} className="btn border px-3 py-1 rounded">Compile + Witness</button>
    </div>
  )
}
