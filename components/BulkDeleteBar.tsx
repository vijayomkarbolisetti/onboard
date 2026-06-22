'use client'

import { Trash2 } from 'lucide-react'

interface BulkDeleteBarProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  onToggleAll: () => void
  onDeleteSelected: () => void
  itemLabel?: string
}

export function BulkDeleteBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onDeleteSelected,
  itemLabel = 'items',
}: BulkDeleteBarProps) {
  if (totalCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-muted">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="h-4 w-4 rounded border-theme accent-aqua"
          aria-label={`Select all ${itemLabel}`}
        />
        <span>
          Select all ({totalCount})
        </span>
      </label>

      {selectedCount > 0 ? (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
        >
          <Trash2 size={15} />
          Delete {selectedCount} selected
        </button>
      ) : null}
    </div>
  )
}

export function BulkSelectCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-theme accent-aqua"
      onClick={(event) => event.stopPropagation()}
    />
  )
}
