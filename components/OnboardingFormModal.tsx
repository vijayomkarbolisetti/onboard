'use client'

import { Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { notify } from '@/lib/toast'
import type { CreateOnboardingInput, Onboarding } from '@/types'

interface OnboardingFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Onboarding | null
  onClose: () => void
  onSubmit: (input: CreateOnboardingInput) => Promise<void>
}

const emptyForm: CreateOnboardingInput = {
  organization: '',
  subscriptionSummary: '',
  agreementDocumentLink: '',
  onboardingDate: '',
  endDate: '',
  campaignLaunchDate: '',
  targetedLeads: 0,
  interestedLeads: 0,
  totalReplies: 0,
  status: '',
  remark: '',
}

function toFormValues(record: Onboarding): CreateOnboardingInput {
  return {
    organization: record.organization ?? '',
    subscriptionSummary: record.subscriptionSummary ?? '',
    agreementDocumentLink: record.agreementDocumentLink ?? '',
    onboardingDate: record.onboardingDate ?? '',
    endDate: record.endDate ?? '',
    campaignLaunchDate: record.campaignLaunchDate ?? '',
    targetedLeads: record.targetedLeads ?? 0,
    interestedLeads: record.interestedLeads ?? 0,
    totalReplies: record.totalReplies ?? 0,
    status: record.status ?? '',
    remark: record.remark ?? '',
  }
}

export function OnboardingFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: OnboardingFormModalProps) {
  const [form, setForm] = useState<CreateOnboardingInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isEdit = mode === 'edit'

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

  const setNumberField = (key: keyof CreateOnboardingInput, value: string) => {
    const parsed = value === '' ? 0 : Number(value)
    setForm({ ...form, [key]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) })
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
        subscriptionSummary: form.subscriptionSummary.trim(),
        agreementDocumentLink: form.agreementDocumentLink.trim(),
        onboardingDate: form.onboardingDate,
        endDate: form.endDate,
        campaignLaunchDate: form.campaignLaunchDate,
        targetedLeads: form.targetedLeads,
        interestedLeads: form.interestedLeads,
        totalReplies: form.totalReplies,
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
              <span className="wyra-label">Subscription Summary</span>
              <textarea
                value={form.subscriptionSummary}
                onChange={(e) => setForm({ ...form, subscriptionSummary: e.target.value })}
                placeholder="Enter subscription plan, billing cycle, or package details..."
                rows={3}
                className="wyra-input resize-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="wyra-label">Agreement Document Link</span>
              <input
                type="url"
                value={form.agreementDocumentLink}
                onChange={(e) => setForm({ ...form, agreementDocumentLink: e.target.value })}
                placeholder="https://..."
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

            <label className="block space-y-2">
              <span className="wyra-label">Campaign Launch Date</span>
              <input
                type="date"
                value={form.campaignLaunchDate}
                onChange={(e) => setForm({ ...form, campaignLaunchDate: e.target.value })}
                className="wyra-input"
              />
            </label>

            <fieldset className="space-y-3 rounded-xl border border-theme bg-theme-hover/40 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                Lead metrics
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    ['targetedLeads', 'Targeted Leads'],
                    ['interestedLeads', 'Interested Leads'],
                    ['totalReplies', 'Total Replies'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex min-w-0 flex-col gap-2">
                    <span className="wyra-label text-sm leading-snug">{label}</span>
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
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
