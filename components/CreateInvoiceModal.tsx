'use client'

import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CreateInvoiceInput, Onboarding } from '@/types'

interface CreateInvoiceModalProps {
  open: boolean
  onboardings: Onboarding[]
  onClose: () => void
  onSubmit: (input: CreateInvoiceInput) => Promise<void>
}

const emptyForm: CreateInvoiceInput = {
  onboardingId: '',
  organization: '',
  invoiceNumber: '',
  amount: 0,
  status: 'pending',
  dueDate: '',
  issuedDate: '',
  description: '',
}

export function CreateInvoiceModal({
  open,
  onboardings,
  onClose,
  onSubmit,
}: CreateInvoiceModalProps) {
  const [form, setForm] = useState<CreateInvoiceInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleOnboardingChange = (onboardingId: string) => {
    const onboarding = onboardings.find((item) => item.id === onboardingId)
    setForm({
      ...form,
      onboardingId,
      organization: onboarding?.organization ?? '',
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.onboardingId) {
      setError('Please select an onboarding')
      return
    }
    if (!form.invoiceNumber.trim()) {
      setError('Invoice number is required')
      return
    }
    if (!form.amount || form.amount <= 0) {
      setError('Amount must be greater than zero')
      return
    }
    if (!form.issuedDate || !form.dueDate) {
      setError('Issued and due dates are required')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        ...form,
        invoiceNumber: form.invoiceNumber.trim(),
        description: form.description.trim(),
      })
      setForm(emptyForm)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative w-full max-w-lg overflow-hidden theme-modal">
        <div className="h-1 bg-wyra-gradient" />
        <div className="flex items-center justify-between border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">Create Invoice</h2>
            <p className="text-sm text-theme-muted">Link an invoice to an onboarding</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <label className="block space-y-2">
            <span className="wyra-label">Onboarding</span>
            <select
              value={form.onboardingId}
              onChange={(e) => handleOnboardingChange(e.target.value)}
              className="wyra-input"
            >
              <option value="">Select organization</option>
              {onboardings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.organization}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="wyra-label">Invoice Number</span>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                placeholder="INV-001"
                className="wyra-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">Amount (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ''}
                onChange={(e) =>
                  setForm({ ...form, amount: Number(e.target.value) })
                }
                placeholder="0.00"
                className="wyra-input"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="wyra-label">Issued Date</span>
              <input
                type="date"
                value={form.issuedDate}
                onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
                className="wyra-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">Due Date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="wyra-input"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="wyra-label">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Invoice details..."
              rows={3}
              className="wyra-input resize-none"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-wyra disabled:opacity-60"
            >
              <Plus size={16} />
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
