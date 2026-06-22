'use client'

import { WyraSelect } from '@/components/CompanyNameSelect'
import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { notify } from '@/lib/toast'
import type {
  CreateOnboardingInvoiceInput,
  OnboardingInvoiceRecord,
  SaasMspAgreement,
} from '@/types'
import {
  numberFieldDisplay,
  parseDecimalField,
  parseIntegerField,
  toNumber,
  type NumberFieldValue,
} from '@/utils/format'

interface OnboardingInvoiceFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: OnboardingInvoiceRecord | null
  onClose: () => void
  onSubmit: (input: CreateOnboardingInvoiceInput) => Promise<void>
}

const emptyForm = {
  companyName: '',
  subscriptionSummary: '',
  agreementDocumentLink: '',
  saasMspAgreement: '' as SaasMspAgreement | '',
  sponsor: '',
  partnerProgram: '',
  pointOfContact: '',
  personEmailId: '',
  onBoardDate: '',
  invoiceAmount: '' as NumberFieldValue,
  firstInvoiceDate: '',
  invoiceCycle: '',
  invoicesGenerated: '' as NumberFieldValue,
  invoicesPaid: '' as NumberFieldValue,
  totalAmountPaid: '' as NumberFieldValue,
  pendingAmount: '' as NumberFieldValue,
  nextInvoiceStatus: '',
}

type OnboardingInvoiceFormState = typeof emptyForm

const agreementOptions: { value: SaasMspAgreement; label: string }[] = [
  { value: 'SaaS', label: 'SaaS' },
  { value: 'MSP', label: 'MSP' },
]

export function OnboardingInvoiceFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: OnboardingInvoiceFormModalProps) {
  const [form, setForm] = useState<OnboardingInvoiceFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm({
        companyName: initial.companyName,
        subscriptionSummary: initial.subscriptionSummary ?? '',
        agreementDocumentLink: initial.agreementDocumentLink ?? '',
        saasMspAgreement: initial.saasMspAgreement,
        sponsor: initial.sponsor,
        partnerProgram: initial.partnerProgram,
        pointOfContact: initial.pointOfContact,
        personEmailId: initial.personEmailId,
        onBoardDate: initial.onBoardDate,
        invoiceAmount: initial.invoiceAmount ?? '',
        firstInvoiceDate: initial.firstInvoiceDate,
        invoiceCycle: initial.invoiceCycle,
        invoicesGenerated: initial.invoicesGenerated ?? '',
        invoicesPaid: initial.invoicesPaid ?? '',
        totalAmountPaid: initial.totalAmountPaid ?? '',
        pendingAmount: initial.pendingAmount ?? '',
        nextInvoiceStatus: initial.nextInvoiceStatus ?? '',
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
        companyName: form.companyName.trim(),
        subscriptionSummary: form.subscriptionSummary.trim(),
        agreementDocumentLink: form.agreementDocumentLink.trim(),
        saasMspAgreement: form.saasMspAgreement as SaasMspAgreement,
        sponsor: form.sponsor.trim(),
        partnerProgram: form.partnerProgram.trim(),
        pointOfContact: form.pointOfContact.trim(),
        personEmailId: form.personEmailId.trim(),
        onBoardDate: form.onBoardDate,
        invoiceAmount: toNumber(form.invoiceAmount),
        firstInvoiceDate: form.firstInvoiceDate,
        invoiceCycle: form.invoiceCycle.trim(),
        invoicesGenerated: toNumber(form.invoicesGenerated),
        invoicesPaid: toNumber(form.invoicesPaid),
        totalAmountPaid: toNumber(form.totalAmountPaid),
        pendingAmount: toNumber(form.pendingAmount),
        nextInvoiceStatus: form.nextInvoiceStatus.trim(),
      })
      notify.success(isEdit ? 'Record updated' : 'Record added')
      setForm(emptyForm)
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
    onClose()
  }

  const set = (key: keyof OnboardingInvoiceFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setIntegerField = (
    key: 'invoicesGenerated' | 'invoicesPaid',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: parseIntegerField(value) }))
  }

  const setDecimalField = (
    key: 'invoiceAmount' | 'totalAmountPaid' | 'pendingAmount',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [key]: parseDecimalField(value) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-center justify-between border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">
              {isEdit ? 'Edit Record' : 'Add Onboarding & Invoice'}
            </h2>
            <p className="text-sm text-theme-muted">Company and billing details</p>
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
            <Field label="Company Name" className="sm:col-span-2">
              <input
                className="wyra-input"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="Company name"
              />
            </Field>

            <Field label="Subscription Summary" className="sm:col-span-2">
              <textarea
                className="wyra-input resize-none"
                value={form.subscriptionSummary}
                onChange={(e) => set('subscriptionSummary', e.target.value)}
                placeholder="Enter subscription plan, billing cycle, or package details..."
                rows={3}
              />
            </Field>

            <Field label="Agreement Document Link" className="sm:col-span-2">
              <input
                type="url"
                className="wyra-input"
                value={form.agreementDocumentLink}
                onChange={(e) => set('agreementDocumentLink', e.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Saas / MSP Agreement">
              <WyraSelect
                value={form.saasMspAgreement}
                onChange={(value) => set('saasMspAgreement', value)}
                placeholder="Select SaaS or MSP"
                options={agreementOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Field>

            <Field label="Sponsor">
              <input
                className="wyra-input"
                value={form.sponsor}
                onChange={(e) => set('sponsor', e.target.value)}
                placeholder="Sponsor name"
              />
            </Field>

            <Field label="Partner Program">
              <input
                className="wyra-input"
                value={form.partnerProgram}
                onChange={(e) => set('partnerProgram', e.target.value)}
                placeholder="Partner program"
              />
            </Field>

            <Field label="Point Of Contact">
              <input
                className="wyra-input"
                value={form.pointOfContact}
                onChange={(e) => set('pointOfContact', e.target.value)}
                placeholder="Contact name"
              />
            </Field>

            <Field label="Person Email Id">
              <input
                type="email"
                className="wyra-input"
                value={form.personEmailId}
                onChange={(e) => set('personEmailId', e.target.value)}
                placeholder="email@company.com"
              />
            </Field>

            <Field label="On Board Date">
              <input
                type="date"
                className="wyra-input"
                value={form.onBoardDate}
                onChange={(e) => set('onBoardDate', e.target.value)}
              />
            </Field>

            <Field label="Invoice Amount (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                className="wyra-input"
                value={numberFieldDisplay(form.invoiceAmount)}
                onChange={(e) => setDecimalField('invoiceAmount', e.target.value)}
                placeholder="0.00"
              />
            </Field>

            <Field label="1st Invoice Date">
              <input
                type="date"
                className="wyra-input"
                value={form.firstInvoiceDate}
                onChange={(e) => set('firstInvoiceDate', e.target.value)}
              />
            </Field>

            <Field label="Invoice Cycle">
              <input
                className="wyra-input"
                value={form.invoiceCycle}
                onChange={(e) => set('invoiceCycle', e.target.value)}
                placeholder="Monthly, Quarterly..."
              />
            </Field>

            <Field label="No. of Invoices Generated">
              <input
                type="number"
                min="0"
                className="wyra-input"
                value={numberFieldDisplay(form.invoicesGenerated)}
                onChange={(e) => setIntegerField('invoicesGenerated', e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <Field label="No. of Invoices Paid">
                <input
                  type="number"
                  min="0"
                  className="wyra-input"
                  value={numberFieldDisplay(form.invoicesPaid)}
                  onChange={(e) => setIntegerField('invoicesPaid', e.target.value)}
                />
              </Field>

              <Field label="Total Amount Paid (USD)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="wyra-input"
                  value={numberFieldDisplay(form.totalAmountPaid)}
                  onChange={(e) => setDecimalField('totalAmountPaid', e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Pending Amount (USD)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="wyra-input"
                  value={numberFieldDisplay(form.pendingAmount)}
                  onChange={(e) => setDecimalField('pendingAmount', e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <Field label="Next Invoice Status" className="sm:col-span-2">
              <input
                type="text"
                className="wyra-input"
                value={form.nextInvoiceStatus}
                onChange={(e) => set('nextInvoiceStatus', e.target.value)}
                placeholder="e.g. Pending, Paid, Scheduled..."
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
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Record'}
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
