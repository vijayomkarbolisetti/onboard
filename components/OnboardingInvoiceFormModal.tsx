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
import { toFormText } from '@/utils/format'

interface OnboardingInvoiceFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: OnboardingInvoiceRecord | null
  onClose: () => void
  onSubmit: (input: CreateOnboardingInvoiceInput) => Promise<void>
}

const emptyForm: CreateOnboardingInvoiceInput = {
  companyName: '',
  subscriptionSummary: '',
  agreementDocumentLink: '',
  saasMspAgreement: 'SaaS',
  sponsor: '',
  partnerProgram: '',
  pointOfContact: '',
  personEmailId: '',
  onBoardDate: '',
  invoiceAmount: '',
  firstInvoiceDate: '',
  invoiceCycle: '',
  invoicesGenerated: '',
  invoicesPaid: '',
  totalAmountPaid: '',
  pendingAmount: '',
  nextInvoiceStatus: '',
}

const agreementOptions: { value: SaasMspAgreement; label: string }[] = [
  { value: 'SaaS', label: 'SaaS' },
  { value: 'MSP', label: 'MSP' },
]

function toFormValues(record: OnboardingInvoiceRecord): CreateOnboardingInvoiceInput {
  return {
    companyName: record.companyName ?? '',
    subscriptionSummary: record.subscriptionSummary ?? '',
    agreementDocumentLink: record.agreementDocumentLink ?? '',
    saasMspAgreement: record.saasMspAgreement,
    sponsor: record.sponsor ?? '',
    partnerProgram: record.partnerProgram ?? '',
    pointOfContact: record.pointOfContact ?? '',
    personEmailId: record.personEmailId ?? '',
    onBoardDate: record.onBoardDate ?? '',
    invoiceAmount: toFormText(record.invoiceAmount),
    firstInvoiceDate: record.firstInvoiceDate ?? '',
    invoiceCycle: record.invoiceCycle ?? '',
    invoicesGenerated: toFormText(record.invoicesGenerated),
    invoicesPaid: toFormText(record.invoicesPaid),
    totalAmountPaid: toFormText(record.totalAmountPaid),
    pendingAmount: toFormText(record.pendingAmount),
    nextInvoiceStatus: record.nextInvoiceStatus ?? '',
  }
}

export function OnboardingInvoiceFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: OnboardingInvoiceFormModalProps) {
  const [form, setForm] = useState<CreateOnboardingInvoiceInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm(toFormValues(initial))
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
        saasMspAgreement: form.saasMspAgreement,
        sponsor: form.sponsor.trim(),
        partnerProgram: form.partnerProgram.trim(),
        pointOfContact: form.pointOfContact.trim(),
        personEmailId: form.personEmailId.trim(),
        onBoardDate: form.onBoardDate,
        invoiceAmount: form.invoiceAmount.trim(),
        firstInvoiceDate: form.firstInvoiceDate,
        invoiceCycle: form.invoiceCycle.trim(),
        invoicesGenerated: form.invoicesGenerated.trim(),
        invoicesPaid: form.invoicesPaid.trim(),
        totalAmountPaid: form.totalAmountPaid.trim(),
        pendingAmount: form.pendingAmount.trim(),
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

  const set = <K extends keyof CreateOnboardingInvoiceInput>(
    key: K,
    value: CreateOnboardingInvoiceInput[K],
  ) => {
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
                type="text"
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
                type="text"
                className="wyra-input"
                value={form.agreementDocumentLink}
                onChange={(e) => set('agreementDocumentLink', e.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Saas / MSP Agreement">
              <WyraSelect
                value={form.saasMspAgreement}
                onChange={(value) => set('saasMspAgreement', value as SaasMspAgreement)}
                placeholder="Select SaaS or MSP"
                allowEmpty={false}
                options={agreementOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Field>

            <Field label="Sponsor">
              <input
                type="text"
                className="wyra-input"
                value={form.sponsor}
                onChange={(e) => set('sponsor', e.target.value)}
                placeholder="Sponsor name"
              />
            </Field>

            <Field label="Partner Program">
              <input
                type="text"
                className="wyra-input"
                value={form.partnerProgram}
                onChange={(e) => set('partnerProgram', e.target.value)}
                placeholder="Partner program"
              />
            </Field>

            <Field label="Point Of Contact">
              <input
                type="text"
                className="wyra-input"
                value={form.pointOfContact}
                onChange={(e) => set('pointOfContact', e.target.value)}
                placeholder="Contact name"
              />
            </Field>

            <Field label="Person Email Id">
              <input
                type="text"
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
                type="text"
                className="wyra-input"
                value={form.invoiceAmount}
                onChange={(e) => set('invoiceAmount', e.target.value)}
                placeholder="Enter amount"
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
                type="text"
                className="wyra-input"
                value={form.invoiceCycle}
                onChange={(e) => set('invoiceCycle', e.target.value)}
                placeholder="Monthly, Quarterly..."
              />
            </Field>

            <Field label="No. of Invoices Generated">
              <input
                type="text"
                className="wyra-input"
                value={form.invoicesGenerated}
                onChange={(e) => set('invoicesGenerated', e.target.value)}
                placeholder="Enter value"
              />
            </Field>

            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <Field label="No. of Invoices Paid">
                <input
                  type="text"
                  className="wyra-input"
                  value={form.invoicesPaid}
                  onChange={(e) => set('invoicesPaid', e.target.value)}
                  placeholder="Enter value"
                />
              </Field>

              <Field label="Total Amount Paid (USD)">
                <input
                  type="text"
                  className="wyra-input"
                  value={form.totalAmountPaid}
                  onChange={(e) => set('totalAmountPaid', e.target.value)}
                  placeholder="Enter amount"
                />
              </Field>

              <Field label="Pending Amount (USD)">
                <input
                  type="text"
                  className="wyra-input"
                  value={form.pendingAmount}
                  onChange={(e) => set('pendingAmount', e.target.value)}
                  placeholder="Enter amount"
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
