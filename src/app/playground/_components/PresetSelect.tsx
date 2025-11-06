import React from 'react'

export function PresetSelect({
  value,
  options,
  onChange,
  onBlur,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (v: string) => void
  onBlur: () => void
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm">Example:</span>
      <select
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        value={value}
        className="border rounded px-2 py-1"
      >
        <option value="">-- none --</option>
        <optgroup label="Repository examples">
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}
