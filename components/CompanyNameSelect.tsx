'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

type BaseProps = {
  companyNames: string[]
  placeholder?: string
}

type SingleSelectProps = BaseProps & {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

type MultiSelectProps = BaseProps & {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

export type CompanyNameSelectProps = SingleSelectProps | MultiSelectProps

export function CompanyNameSelect(props: CompanyNameSelectProps) {
  const {
    companyNames,
    placeholder = 'Select company',
    multiple = false,
    value,
    onChange,
  } = props

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = useMemo(() => {
    if (multiple) return value as string[]
    const single = (value as string).trim()
    return single ? [single] : []
  }, [multiple, value])

  const options = useMemo(() => {
    const names = new Set(companyNames)
    selected.forEach((name) => names.add(name))
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [companyNames, selected])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const toggleOption = (name: string) => {
    if (multiple) {
      const current = value as string[]
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
      ;(onChange as (next: string[]) => void)(next)
      return
    }

    ;(onChange as (next: string) => void)(name)
    setOpen(false)
  }

  const clearSelection = () => {
    if (multiple) {
      ;(onChange as (next: string[]) => void)([])
      return
    }
    ;(onChange as (next: string) => void)('')
    setOpen(false)
  }

  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return placeholder
    if (!multiple) return selected[0]
    if (selected.length === 1) return selected[0]
    return `${selected.length} companies selected`
  }, [multiple, placeholder, selected])

  if (options.length === 0) {
    const textValue = multiple ? selected.join(', ') : (value as string)
    return (
      <input
        className="wyra-input"
        value={textValue}
        onChange={(e) => {
          if (multiple) {
            const next = e.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
            ;(onChange as (next: string[]) => void)(next)
            return
          }
          ;(onChange as (next: string) => void)(e.target.value)
        }}
        placeholder="Company name"
      />
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="wyra-input flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selected.length === 0 ? 'text-theme-muted opacity-70' : 'truncate'}>
          {triggerLabel}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-theme-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-theme bg-theme-modal shadow-lg"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {!multiple ? (
              <button
                type="button"
                role="option"
                aria-selected={selected.length === 0}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-theme-muted hover:bg-theme-hover"
                onClick={clearSelection}
              >
                <span className="w-4" />
                {placeholder}
              </button>
            ) : null}

            {options.map((name) => {
              const isSelected = selected.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-theme-fg hover:bg-theme-hover"
                  onClick={() => toggleOption(name)}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected ? <Check size={14} className="text-aqua" /> : null}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
