import React from 'react'

export function EditorTextArea({
  label,
  value,
  onChange,
  onBlur,
  rows,
  placeholder,
  readOnly,
  className,
}: {
  label?: string
  value: string
  onChange?: (v: string) => void
  onBlur?: () => void
  rows?: number
  placeholder?: string
  readOnly?: boolean
  className?: string
}) {
  return (
    <div>
      {label ? (
        <label className="block text-sm font-medium">{label}</label>
      ) : null}
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        rows={rows}
        readOnly={readOnly}
        className={className ?? 'w-full font-mono text-sm border rounded p-2'}
        placeholder={placeholder}
      />
    </div>
  )
}
