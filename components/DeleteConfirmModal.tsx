'use client'

import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function DeleteConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  loading = false,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={onClose}
        disabled={loading}
        aria-label="Close dialog"
      />
      <div className="relative w-full max-w-md overflow-hidden theme-modal">
        <div className="h-1 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-theme-fg">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-theme-muted">{description}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted transition hover:bg-theme-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {loading ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
