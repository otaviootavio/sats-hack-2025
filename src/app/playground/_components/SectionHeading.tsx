import React from 'react'

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{children}</label>
}
