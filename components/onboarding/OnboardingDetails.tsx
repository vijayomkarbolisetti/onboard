'use client'

import { Building2, Calendar, MessageSquare, Pencil, Plus, Rocket, Target, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { OnboardingFormModal } from '@/components/OnboardingFormModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
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
  onDelete: (id: string) => Promise<void>
}

export function OnboardingDetails({
  onboardings,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: OnboardingDetailsProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Onboarding | null>(null)
  const { openDeleteConfirm, deleteModal } = useDeleteConfirm({
    onConfirm: onDelete,
    successMessage: 'Client tracker deleted',
    errorMessage: 'Failed to delete client tracker',
  })

  const actionToolbar = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
        <Plus size={16} />
        Create Client Tracker
      </button>
    </div>
  )

  const contentPanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="grid items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover"
          />
        ))}
      </div>
    </div>
  ) : onboardings.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-aqua/10">
          <Building2 className="text-aqua" size={32} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-theme-fg">No campaigns yet</h3>
        <p className="mt-2 text-sm text-theme-muted">
          Create your first client tracker to start monitoring leads
        </p>
      </div>
    </div>
  ) : (
    <div className="p-5 sm:p-7">
      <div className="grid items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {onboardings.map((item) => (
          <article
            key={item.id}
            className="glass-panel flex h-full flex-col overflow-hidden transition duration-300 hover:border-aqua/30"
          >
            <div className="h-0.5 shrink-0 bg-wyra-gradient opacity-80" />

            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold text-theme-fg">
                    {item.organization || 'Unnamed organization'}
                  </h3>
                  <p className="mt-1 text-sm text-theme-muted">
                    Launch: {formatDate(item.campaignLaunchDate)}
                  </p>
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
                    title="Edit client tracker"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openDeleteConfirm(item.id, item.organization || 'Unnamed organization', {
                        title: 'Delete client tracker?',
                      })
                    }
                    className="rounded-lg p-2 text-theme-muted transition hover:bg-red-500/10 hover:text-red-400"
                    title="Delete client tracker"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-2.5 text-sm">
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <Calendar size={15} className="shrink-0 text-aqua" />
                  <span>Onboarding: {formatDate(item.onboardingDate)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <Rocket size={15} className="shrink-0 text-lime" />
                  <span>End Date: {formatDate(item.endDate)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <Calendar size={15} className="shrink-0 text-wyra-blue" />
                  <span>Campaign Launch: {formatDate(item.campaignLaunchDate)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <Target size={15} className="shrink-0 text-lime" />
                  <span>Targeted Leads: {item.targetedLeads ?? 0}</span>
                </div>
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <Users size={15} className="shrink-0 text-wyra-blue" />
                  <span>Interested Leads: {item.interestedLeads ?? 0}</span>
                </div>
                <div className="flex items-center gap-2.5 text-theme-muted">
                  <MessageSquare size={15} className="shrink-0 text-aqua" />
                  <span>Total Replies: {item.totalReplies ?? 0}</span>
                </div>
              </div>

              <div className="mt-4 min-h-[4.5rem] rounded-xl border border-theme bg-theme-hover px-3 py-2.5 text-sm">
                {item.remark ? (
                  <p className="text-theme-body leading-relaxed">{item.remark}</p>
                ) : (
                  <p className="text-theme-muted italic">No remark added</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {actionToolbar}

      <div className="content-shell overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
        {contentPanel}
      </div>

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

      {deleteModal}
    </div>
  )
}
