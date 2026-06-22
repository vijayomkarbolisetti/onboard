'use client'

import { WyraSelect } from '@/components/CompanyNameSelect'
import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { notify } from '@/lib/toast'
import type { CreateExpenseInput, Expense } from '@/types'
import { numberFieldDisplay, parseDecimalField, toNumber, type NumberFieldValue } from '@/utils/format'

interface ExpenseFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Expense | null
  onClose: () => void
  onSubmit: (input: CreateExpenseInput) => Promise<void>
}

const emptyForm = {
  toolName: '',
  invoiceDate: '',
  cardUsed: '',
  cardOwner: '',
  amount: '' as NumberFieldValue,
  currency: 'USD',
}

type ExpenseFormState = typeof emptyForm

const currencyOptions = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']

export function ExpenseFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) {
  const [form, setForm] = useState<ExpenseFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm({
        toolName: initial.toolName,
        invoiceDate: initial.invoiceDate,
        cardUsed: initial.cardUsed,
        cardOwner: initial.cardOwner,
        amount: initial.amount ?? '',
        currency: initial.currency,
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, isEdit, initial])

  if (!open) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setSubmitting(true)
    try {
      await onSubmit({
        toolName: form.toolName.trim(),
        invoiceDate: form.invoiceDate,
        cardUsed: form.cardUsed.trim(),
        cardOwner: form.cardOwner.trim(),
        amount: toNumber(form.amount),
        currency: form.currency.trim() || 'USD',
      })
      notify.success(isEdit ? 'Expense updated' : 'Expense added')
      setForm(emptyForm)
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
    onClose()
  }

  const set = (key: keyof ExpenseFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-center justify-between border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">
              {isEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-sm text-theme-muted">Tool and card payment details</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tool Name" className="sm:col-span-2">
              <input
                className="wyra-input"
                value={form.toolName}
                onChange={(e) => set('toolName', e.target.value)}
                placeholder="e.g. Figma, AWS, Notion"
              />
            </Field>

            <Field label="Invoice Date">
              <input
                type="date"
                className="wyra-input"
                value={form.invoiceDate}
                onChange={(e) => set('invoiceDate', e.target.value)}
              />
            </Field>

            <Field label="Card Used">
              <input
                className="wyra-input"
                value={form.cardUsed}
                onChange={(e) => set('cardUsed', e.target.value)}
                placeholder="Visa **** 4242"
              />
            </Field>

            <Field label="Card Owner">
              <input
                className="wyra-input"
                value={form.cardOwner}
                onChange={(e) => set('cardOwner', e.target.value)}
                placeholder="Card holder name"
              />
            </Field>

            <Field label="Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                className="wyra-input"
                value={numberFieldDisplay(form.amount)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: parseDecimalField(e.target.value) }))
                }
                placeholder="0.00"
              />
            </Field>

            <Field label="Currency">
              <WyraSelect
                value={form.currency}
                onChange={(value) => set('currency', value)}
                allowEmpty={false}
                placeholder="Currency"
                options={currencyOptions.map((code) => ({ value: code, label: code }))}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-wyra disabled:opacity-60">
              {isEdit ? <Save size={16} /> : <Plus size={16} />}
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="wyra-label">{label}</span>
      {children}
    </label>
  )
}
