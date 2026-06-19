'use client'

import { Pencil, Plus, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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
  onboardingDate: '',
  campaignLaunchDate: '',
  remarks: '',
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
  const [error, setError] = useState<string | null>(null)

  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setForm({
        organization: initial.organization,
        onboardingDate: initial.onboardingDate,
        campaignLaunchDate: initial.campaignLaunchDate,
        remarks: initial.remarks,
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [open, isEdit, initial])

  if (!open) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.organization.trim()) {
      setError('Organization is required')
      return
    }
    if (!form.onboardingDate) {
      setError('Onboarding date is required')
      return
    }
    if (!form.campaignLaunchDate) {
      setError('End date is required')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        organization: form.organization.trim(),
        onboardingDate: form.onboardingDate,
        campaignLaunchDate: form.campaignLaunchDate,
        remarks: form.remarks.trim(),
      })
      setForm(emptyForm)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isEdit ? 'update' : 'create'} onboarding`,
      )
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
            <h2 className="text-lg font-bold text-theme-fg">
              {isEdit ? 'Edit Client Tracker' : 'Create Client Tracker'}
            </h2>
            <p className="text-sm text-theme-muted">
              {isEdit
                ? 'Update organization details and dates'
                : 'Add a new organization to the pipeline'}
            </p>
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
            <span className="wyra-label">Organization</span>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              placeholder="Enter organization name"
              className="wyra-input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
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
                value={form.campaignLaunchDate}
                onChange={(e) =>
                  setForm({ ...form, campaignLaunchDate: e.target.value })
                }
                className="wyra-input"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="wyra-label">Remarks</span>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Add notes or context..."
              rows={4}
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
    </div>
  )
}

/** @deprecated Use OnboardingFormModal */
export const CreateOnboardingModal = OnboardingFormModal
