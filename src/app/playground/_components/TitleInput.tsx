import React from 'react'

export function TitleInput({
  value,
  onChange,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm">Title:</span>
      <input
        type="text"
        className="border rounded px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Untitled"
      />
    </label>
  )
}
