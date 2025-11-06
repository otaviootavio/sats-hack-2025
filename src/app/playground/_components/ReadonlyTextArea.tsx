import React from 'react'

export function ReadonlyTextArea({
  value,
  rows,
  className,
}: {
  value: string
  rows?: number
  className?: string
}) {
  return (
    <textarea
      value={value}
      readOnly
      rows={rows}
      className={className ?? 'w-full font-mono text-sm border rounded p-2'}
    />
  )
}
