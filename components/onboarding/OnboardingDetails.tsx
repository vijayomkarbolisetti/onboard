'use client'

import { Building2, Calendar, Pencil, Plus, Rocket, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { OnboardingFormModal } from '@/components/OnboardingFormModal'
import type { CreateOnboardingInput, Onboarding } from '@/types'
import {
  formatDate,
  onboardingStatusClass,
  onboardingStatusLabel,
} from '@/utils/format'
import { cn } from '@/lib/utils'

interface OnboardingDetailsProps {
  onboardings: Onboarding[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateOnboardingInput) => Promise<void>
  onUpdate: (id: string, input: CreateOnboardingInput) => Promise<void>
  onStatusChange: (id: string, status: Onboarding['status']) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function OnboardingDetails({
  onboardings,
  loading,
  error,
  onCreate,
  onUpdate,
  onStatusChange,
  onDelete,
}: OnboardingDetailsProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Onboarding | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end border-b border-theme pb-5">
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Create Client Tracker
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover"
            />
          ))}
        </div>
      ) : onboardings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-aqua/10">
            <Building2 className="text-aqua" size={32} />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-theme-fg">No onboardings yet</h3>
          <p className="mt-2 text-sm text-theme-muted">
            Create your first organization to start tracking
          </p>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra mt-6">
            <Plus size={16} />
            Create Client Tracker
          </button>
        </div>
      ) : (
        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {onboardings.map((item) => (
            <article
              key={item.id}
              className="glass-panel flex h-full flex-col overflow-hidden transition duration-300 hover:border-aqua/30"
            >
              <div className="h-0.5 shrink-0 bg-wyra-gradient opacity-80" />

              <div className="flex flex-1 flex-col p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-theme-fg">
                      {item.organization}
                    </h3>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                        onboardingStatusClass(item.status),
                      )}
                    >
                      {onboardingStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="rounded-lg p-2 text-theme-muted transition hover:bg-aqua/10 hover:text-aqua"
                      title="Edit onboarding"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(item.id)}
                      className="rounded-lg p-2 text-theme-muted transition hover:bg-red-500/10 hover:text-red-400"
                      title="Delete onboarding"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Dates */}
                <div className="mt-5 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5 text-theme-muted">
                    <Calendar size={15} className="shrink-0 text-aqua" />
                    <span>Onboarding: {formatDate(item.onboardingDate)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-theme-muted">
                    <Rocket size={15} className="shrink-0 text-lime" />
                    <span>End Date: {formatDate(item.campaignLaunchDate)}</span>
                  </div>
                </div>

                {/* Remarks — fixed min height for alignment */}
                <div className="mt-4 min-h-[4.5rem] rounded-xl border border-theme bg-theme-hover px-3 py-2.5 text-sm">
                  {item.remarks ? (
                    <p className="text-theme-body leading-relaxed">{item.remarks}</p>
                  ) : (
                    <p className="text-theme-muted italic">No remarks added</p>
                  )}
                </div>

                {/* Status — pinned to bottom */}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {(['pending', 'in_progress', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void onStatusChange(item.id, status)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition',
                        item.status === status
                          ? 'btn-wyra-nav font-bold'
                          : 'border border-theme-strong text-theme-muted hover:text-theme-fg',
                      )}
                    >
                      {onboardingStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <OnboardingFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <OnboardingFormModal
        open={Boolean(editing)}
        mode="edit"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing) await onUpdate(editing.id, input)
        }}
      />
    </div>
  )
}
