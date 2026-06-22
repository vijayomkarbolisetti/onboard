'use client'

import { Pencil, X } from 'lucide-react'
import type { ReactNode } from 'react'

export interface DetailField {
  label: string
  value: ReactNode
  fullWidth?: boolean
}

interface RowDetailsModalProps {
  open: boolean
  title: string
  subtitle?: string
  fields: DetailField[]
  onClose: () => void
  onEdit?: () => void
}

export function RowDetailsModal({
  open,
  title,
  subtitle,
  fields,
  onClose,
  onEdit,
}: RowDetailsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close details"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-theme-fg">View Details</h2>
            <p className="mt-1 truncate text-sm font-semibold text-theme-fg">{title}</p>
            {subtitle ? <p className="mt-0.5 text-sm text-theme-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className={field.fullWidth ? 'sm:col-span-2' : undefined}
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                  {field.label}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-theme-body break-words">
                  {field.value ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-theme px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
          >
            Close
          </button>
          {onEdit ? (
            <button type="button" onClick={onEdit} className="btn-wyra">
              <Pencil size={16} />
              Edit
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
