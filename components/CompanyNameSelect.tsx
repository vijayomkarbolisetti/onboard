'use client'

import { useMemo } from 'react'

interface CompanyNameSelectProps {
  value: string
  onChange: (value: string) => void
  companyNames: string[]
  placeholder?: string
}

export function CompanyNameSelect({
  value,
  onChange,
  companyNames,
  placeholder = 'Select company',
}: CompanyNameSelectProps) {
  const options = useMemo(() => {
    const names = new Set(companyNames)
    const trimmed = value.trim()
    if (trimmed) names.add(trimmed)
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [companyNames, value])

  if (options.length === 0) {
    return (
      <input
        className="wyra-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Company name"
      />
    )
  }

  return (
    <select
      className="wyra-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  )
}
