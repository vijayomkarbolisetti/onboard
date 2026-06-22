'use client'

import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { notify } from '@/lib/toast'
import type { CreateOnboardingInput, Onboarding } from '@/types'
import {
  numberFieldDisplay,
  parseDecimalField,
  parseIntegerField,
  toNumber,
  type NumberFieldValue,
} from '@/utils/format'

interface OnboardingFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Onboarding | null
  onClose: () => void
  onSubmit: (input: CreateOnboardingInput) => Promise<void>
}

const emptyForm = {
  organization: '',
  noOfAiSdrs: '' as NumberFieldValue,
  onboardingDate: '',
  endDate: '',
  committedAmount: '' as NumberFieldValue,
  paidAmount: '' as NumberFieldValue,
  campaignLaunchDate: '',
  noOfCampaigns: '' as NumberFieldValue,
  targetedLeads: '' as NumberFieldValue,
  contactedLeads: '' as NumberFieldValue,
  interestedLeads: '' as NumberFieldValue,
  totalReplies: '' as NumberFieldValue,
  status: '',
  remark: '',
}

type OnboardingFormState = typeof emptyForm

function toFormValues(record: Onboarding): OnboardingFormState {
  return {
    ...emptyForm,
    organization: record.organization ?? '',
    noOfAiSdrs: record.noOfAiSdrs ?? 0,
    onboardingDate: record.onboardingDate ?? '',
    endDate: record.endDate ?? '',
    committedAmount: record.committedAmount ?? 0,
    paidAmount: record.paidAmount ?? 0,
    campaignLaunchDate: record.campaignLaunchDate ?? '',
    noOfCampaigns: record.noOfCampaigns ?? 0,
    targetedLeads: record.targetedLeads ?? 0,
    contactedLeads: record.contactedLeads ?? 0,
    interestedLeads: record.interestedLeads ?? 0,
    totalReplies: record.totalReplies ?? 0,
    status: record.status ?? '',
    remark: record.remark ?? '',
  }
}

const leadMetricFields = [
  ['targetedLeads', 'Targeted Leads'],
  ['contactedLeads', 'Contacted Leads'],
  ['interestedLeads', 'Interested Leads'],
  ['totalReplies', 'Total Replies'],
] as const satisfies ReadonlyArray<
  readonly [keyof Pick<OnboardingFormState, 'targetedLeads' | 'contactedLeads' | 'interestedLeads' | 'totalReplies'>, string]
>

export function OnboardingFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: OnboardingFormModalProps) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState<OnboardingFormState>(() =>
    open && mode === 'edit' && initial ? toFormValues(initial) : emptyForm,
  )
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm(toFormValues(initial))
    } else {
      setForm(emptyForm)
    }
  }, [open, isEdit, initial])

  const setAmountField = (key: 'committedAmount' | 'paidAmount', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: parseDecimalField(value),
    }))
  }

  const setNumberField = (key: keyof OnboardingFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: parseIntegerField(value),
    }))
  }

  const handleClose = () => {
    if (submitting) return
    setForm(emptyForm)
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setSubmitting(true)
    try {
      await onSubmit({
        organization: form.organization.trim(),
        noOfAiSdrs: toNumber(form.noOfAiSdrs),
        onboardingDate: form.onboardingDate,
        endDate: form.endDate,
        committedAmount: toNumber(form.committedAmount),
        paidAmount: toNumber(form.paidAmount),
        campaignLaunchDate: form.campaignLaunchDate,
        noOfCampaigns: toNumber(form.noOfCampaigns),
        targetedLeads: toNumber(form.targetedLeads),
        contactedLeads: toNumber(form.contactedLeads),
        interestedLeads: toNumber(form.interestedLeads),
        totalReplies: toNumber(form.totalReplies),
        status: form.status.trim(),
        remark: form.remark.trim(),
      })
      notify.success(isEdit ? 'Client tracker updated' : 'Client tracker created')
      setForm(emptyForm)
      onClose()
    } catch (err) {
      notify.error(
        err instanceof Error
          ? err.message
          : `Failed to ${isEdit ? 'update' : 'create'} client tracker`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-center justify-between border-b border-theme px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg font-bold text-theme-fg">
              {isEdit ? 'Edit Client Tracker' : 'Create Client Tracker'}
            </h2>
            <p className="text-sm text-theme-muted">
              {isEdit
                ? 'Update organization details and campaign metrics'
                : 'Add a new organization to the pipeline'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-2 text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <label className="block space-y-2">
              <span className="wyra-label">Organization</span>
              <input
                type="text"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="Enter organization name"
                className="wyra-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">No.of AI SDRs</span>
              <input
                type="number"
                min={0}
                value={numberFieldDisplay(form.noOfAiSdrs)}
                onChange={(e) => setNumberField('noOfAiSdrs', e.target.value)}
                placeholder="0"
                className="wyra-input"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="wyra-label">Onboarding Date</span>
                <input
                  type="date"
                  value={form.onboardingDate}
                  onChange={(e) => setForm({ ...form, onboardingDate: e.target.value })}
                  className="wyra-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="wyra-label">End Date</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="wyra-input"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="wyra-label">Committed Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={numberFieldDisplay(form.committedAmount)}
                  onChange={(e) => setAmountField('committedAmount', e.target.value)}
                  placeholder="0.00"
                  className="wyra-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="wyra-label">Paid Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={numberFieldDisplay(form.paidAmount)}
                  onChange={(e) => setAmountField('paidAmount', e.target.value)}
                  placeholder="0.00"
                  className="wyra-input"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="wyra-label">1st campaign Launch date</span>
              <input
                type="date"
                value={form.campaignLaunchDate}
                onChange={(e) => setForm({ ...form, campaignLaunchDate: e.target.value })}
                className="wyra-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">no.of campaigns</span>
              <input
                type="number"
                min={0}
                value={numberFieldDisplay(form.noOfCampaigns)}
                onChange={(e) => setNumberField('noOfCampaigns', e.target.value)}
                placeholder="0"
                className="wyra-input"
              />
            </label>

            <fieldset className="space-y-3 rounded-xl border border-theme bg-theme-hover/40 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                Lead metrics
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {leadMetricFields.map(([key, label]) => (
                  <label key={key} className="flex min-w-0 flex-col gap-2">
                    <span className="wyra-label text-sm leading-snug">{label}</span>
                    <input
                      type="number"
                      min={0}
                      value={numberFieldDisplay(form[key])}
                      onChange={(e) => setNumberField(key, e.target.value)}
                      placeholder="0"
                      className="wyra-input"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-2">
              <span className="wyra-label">Status</span>
              <input
                type="text"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                placeholder="e.g. Pending, In progress, Completed"
                className="wyra-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">Remark</span>
              <textarea
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder="Add notes or context..."
                rows={4}
                className="wyra-input resize-none"
              />
            </label>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-theme p-5 sm:flex-row sm:justify-end sm:p-6">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-wyra disabled:opacity-60">
              {isEdit ? <Save size={16} /> : <Plus size={16} />}
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Client Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

/** @deprecated Use OnboardingFormModal */
export const CreateOnboardingModal = OnboardingFormModal
