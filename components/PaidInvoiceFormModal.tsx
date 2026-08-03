'use client'

import { CompanyNameSelect, WyraSelect } from '@/components/CompanyNameSelect'
import { DocumentField } from '@/components/DocumentField'
import { UsdEquivalentHint } from '@/components/UsdEquivalentHint'
import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { CURRENCY_OPTIONS, resolveCurrency } from '@/lib/currency'
import { notify } from '@/lib/toast'
import type { CreatePaidInvoiceInput, PaidInvoice, StoredDocument } from '@/types'
import {
  formatCompanyNames,
  parseCompanyNames,
  resolveInvoiceNumber,
  toFormText,
} from '@/utils/format'

interface PaidInvoiceFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: PaidInvoice | null
  companyNames: string[]
  onClose: () => void
  onSubmit: (input: CreatePaidInvoiceInput) => Promise<void>
}

const emptyForm: CreatePaidInvoiceInput = {
  invoiceDate: '',
  customerName: '',
  companyName: '',
  invoiceNumber: '',
  invoiceAmount: '',
  currency: 'USD',
  status: '',
  paymentDate: '',
  paymentMethod: '',
  salesPersonName: '',
  documents: [],
}

type PaidInvoiceFormState = Omit<CreatePaidInvoiceInput, 'companyName'>

export function PaidInvoiceFormModal({
  open,
  mode,
  initial,
  companyNames,
  onClose,
  onSubmit,
}: PaidInvoiceFormModalProps) {
  const [form, setForm] = useState<PaidInvoiceFormState>(emptyForm)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm({
        invoiceDate: initial.invoiceDate,
        customerName: initial.customerName,
        invoiceNumber: resolveInvoiceNumber(initial as unknown as Record<string, unknown>),
        invoiceAmount: toFormText(initial.invoiceAmount),
        currency: resolveCurrency(initial.currency, initial.invoiceAmount),
        status: initial.status,
        paymentDate: initial.paymentDate,
        paymentMethod: initial.paymentMethod,
        salesPersonName: initial.salesPersonName ?? '',
        documents: initial.documents ?? [],
      })
      setSelectedCompanies(parseCompanyNames(initial.companyName))
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
      invoiceAmount: form.invoiceAmount.trim(),
      currency: form.currency.trim() || 'USD',
      status: form.status.trim(),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod.trim(),
      salesPersonName: form.salesPersonName.trim(),
      documents: form.documents ?? [],
    }

    const companies = selectedCompanies.map((name) => name.trim()).filter(Boolean)
    const companyName = formatCompanyNames(companies)

    setSubmitting(true)
    try {
      if (isEdit) {
        await onSubmit({ ...payload, companyName })
      } else if (companies.length === 0) {
        await onSubmit({ ...payload, companyName: '' })
      } else {
        for (const companyName of companies) {
          await onSubmit({ ...payload, companyName })
        }
      }
      notify.success(
        isEdit
          ? 'Paid invoice updated'
          : companies.length <= 1
            ? 'Paid invoice added'
            : `${companies.length} paid invoices added`,
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

  const set = (key: keyof PaidInvoiceFormState, value: string | StoredDocument[]) => {
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
              {isEdit ? 'Edit Paid Invoice' : 'Add Paid Invoice'}
            </h2>
            <p className="text-sm text-theme-muted">Payment and invoice details</p>
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
              <CompanyNameSelect
                multiple
                value={selectedCompanies}
                onChange={setSelectedCompanies}
                companyNames={companyNames}
              />
            </Field>

            <Field label="Invoice Amount">
              <input
                type="text"
                className="wyra-input"
                value={form.invoiceAmount}
                onChange={(e) => set('invoiceAmount', e.target.value)}
                placeholder="Enter amount"
              />
              <UsdEquivalentHint amount={form.invoiceAmount} currency={form.currency} />
            </Field>

            <Field label="Currency">
              <WyraSelect
                value={form.currency}
                onChange={(value) => set('currency', value)}
                allowEmpty={false}
                options={CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))}
              />
            </Field>

            <Field label="Status">
              <input
                className="wyra-input"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                placeholder="Paid"
              />
            </Field>

            <Field label="Payment Date">
              <input
                type="date"
                className="wyra-input"
                value={form.paymentDate}
                onChange={(e) => set('paymentDate', e.target.value)}
              />
            </Field>

            <Field label="Payment Method">
              <input
                className="wyra-input"
                value={form.paymentMethod}
                onChange={(e) => set('paymentMethod', e.target.value)}
                placeholder="Bank transfer, Card..."
              />
            </Field>

            <Field label="Sales Person Name">
              <input
                className="wyra-input"
                value={form.salesPersonName}
                onChange={(e) => set('salesPersonName', e.target.value)}
                placeholder="Sales person name (optional)"
              />
            </Field>

            <div className="sm:col-span-2 space-y-2">
              <span className="wyra-label">Documents</span>
              <DocumentField
                folder="paid-invoices"
                documents={form.documents ?? []}
                onChange={(documents) => set('documents', documents)}
                disabled={submitting}
              />
            </div>
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
