'use client'

import { CompanyNameSelect } from '@/components/CompanyNameSelect'
import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { notify } from '@/lib/toast'
import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import { resolveInvoiceNumber } from '@/utils/format'

interface OpenInvoiceFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: OpenInvoice | null
  companyNames: string[]
  onClose: () => void
  onSubmit: (input: CreateOpenInvoiceInput) => Promise<void>
}

const emptyForm: CreateOpenInvoiceInput = {
  invoiceDate: '',
  customerName: '',
  companyName: '',
  invoiceNumber: '',
  invoiceAmount: 0,
  status: '',
  notes: '',
}

export function OpenInvoiceFormModal({
  open,
  mode,
  initial,
  companyNames,
  onClose,
  onSubmit,
}: OpenInvoiceFormModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm({
        invoiceDate: initial.invoiceDate,
        customerName: initial.customerName,
        companyName: initial.companyName,
        invoiceNumber: resolveInvoiceNumber(initial as unknown as Record<string, unknown>),
        invoiceAmount: initial.invoiceAmount,
        status: initial.status,
        notes: initial.notes,
      })
      setSelectedCompanies([])
    } else {
      setForm(emptyForm)
      setSelectedCompanies([])
    }
  }, [open, isEdit, initial])

  if (!open) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const payload = {
      invoiceDate: form.invoiceDate,
      customerName: form.customerName.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceAmount: form.invoiceAmount,
      status: form.status.trim(),
      notes: form.notes.trim(),
    }

    const companies = isEdit
      ? [form.companyName.trim()].filter(Boolean)
      : selectedCompanies.map((name) => name.trim()).filter(Boolean)

    setSubmitting(true)
    try {
      if (isEdit) {
        await onSubmit({ ...payload, companyName: form.companyName.trim() })
      } else if (companies.length === 0) {
        await onSubmit({ ...payload, companyName: '' })
      } else {
        for (const companyName of companies) {
          await onSubmit({ ...payload, companyName })
        }
      }
      notify.success(
        isEdit
          ? 'Open invoice updated'
          : companies.length <= 1
            ? 'Open invoice added'
            : `${companies.length} open invoices added`,
      )
      setForm(emptyForm)
      setSelectedCompanies([])
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
    setSelectedCompanies([])
    onClose()
  }

  const set = (key: keyof CreateOpenInvoiceInput, value: string | number) => {
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
              {isEdit ? 'Edit Open Invoice' : 'Add Open Invoice'}
            </h2>
            <p className="text-sm text-theme-muted">Outstanding invoice details</p>
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
            <Field label="Invoice Date">
              <input
                type="date"
                className="wyra-input"
                value={form.invoiceDate}
                onChange={(e) => set('invoiceDate', e.target.value)}
              />
            </Field>

            <Field label="Invoice Number">
              <input
                className="wyra-input"
                value={form.invoiceNumber}
                onChange={(e) => set('invoiceNumber', e.target.value)}
                placeholder="INV-001"
              />
            </Field>

            <Field label="Customer Name">
              <input
                className="wyra-input"
                value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)}
                placeholder="Customer name"
              />
            </Field>

            <Field label="Company Name">
              {isEdit ? (
                <CompanyNameSelect
                  value={form.companyName}
                  onChange={(value) => set('companyName', value)}
                  companyNames={companyNames}
                />
              ) : (
                <CompanyNameSelect
                  multiple
                  value={selectedCompanies}
                  onChange={setSelectedCompanies}
                  companyNames={companyNames}
                />
              )}
            </Field>

            <Field label="Invoice Amount (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                className="wyra-input"
                value={form.invoiceAmount || ''}
                onChange={(e) => set('invoiceAmount', Number(e.target.value))}
                placeholder="0.00"
              />
            </Field>

            <Field label="Status">
              <input
                className="wyra-input"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                placeholder="Open, Pending..."
              />
            </Field>

            <Field label="Notes" className="sm:col-span-2">
              <textarea
                className="wyra-input min-h-[88px] resize-y"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Additional notes..."
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
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Invoice'}
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
