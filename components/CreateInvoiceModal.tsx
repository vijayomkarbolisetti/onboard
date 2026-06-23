'use client'

import { WyraSelect } from '@/components/CompanyNameSelect'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { notify } from '@/lib/toast'
import type { CreateInvoiceInput, Onboarding } from '@/types'
import { formatDate } from '@/utils/format'

interface CreateInvoiceModalProps {
  open: boolean
  onboardings: Onboarding[]
  onClose: () => void
  onSubmit: (input: CreateInvoiceInput) => Promise<void>
}

const emptyForm = {
  onboardingId: '',
  organization: '',
  invoiceNumber: '',
  amount: '',
  status: 'pending' as CreateInvoiceInput['status'],
  dueDate: '',
  issuedDate: '',
  description: '',
}

type CreateInvoiceFormState = typeof emptyForm

export function CreateInvoiceModal({
  open,
  onboardings,
  onClose,
  onSubmit,
}: CreateInvoiceModalProps) {
  const [form, setForm] = useState<CreateInvoiceFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const onboardingLabel = (item: Onboarding) =>
    item.organization?.trim() || `Campaign - ${formatDate(item.campaignLaunchDate)}`

  const handleOnboardingChange = (onboardingId: string) => {
    const onboarding = onboardings.find((item) => item.id === onboardingId)
    setForm({
      ...form,
      onboardingId,
      organization: onboarding
        ? onboarding.organization?.trim() || onboardingLabel(onboarding)
        : '',
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setSubmitting(true)
    try {
      await onSubmit({
        onboardingId: form.onboardingId,
        organization: form.organization,
        invoiceNumber: form.invoiceNumber.trim(),
        amount: form.amount.trim(),
        status: form.status,
        dueDate: form.dueDate,
        issuedDate: form.issuedDate,
        description: form.description.trim(),
      })
      notify.success('Invoice created')
      setForm(emptyForm)
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
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
            <WyraSelect
              value={form.onboardingId}
              onChange={handleOnboardingChange}
              placeholder="Select organization"
              options={onboardings.map((item) => ({
                value: item.id,
                label: onboardingLabel(item),
              }))}
            />
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
                type="text"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter amount"
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
