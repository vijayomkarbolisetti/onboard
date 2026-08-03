'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ModuleAccessCheckboxes } from '@/components/team/ModuleAccessCheckboxes'
import {
  defaultMemberModuleAccess,
  type ModuleId,
  type ModulePermission,
} from '@/lib/modulePermissions'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Props = {
  userId: string
  memberName: string
  initialAccess?: Record<ModuleId, ModulePermission> | null
  disabled?: boolean
  defaultOpen?: boolean
  onSaved: (access: Record<ModuleId, ModulePermission>) => void
}

export function MemberModulePermissionsEditor({
  userId,
  memberName,
  initialAccess,
  disabled,
  defaultOpen = false,
  onSaved,
}: Props) {
  const fallback = defaultMemberModuleAccess()
  const [open, setOpen] = useState(defaultOpen)
  const [saving, setSaving] = useState(false)
  const [access, setAccess] = useState<Record<ModuleId, ModulePermission>>(
    initialAccess ?? fallback,
  )

  useEffect(() => {
    setAccess(initialAccess ?? fallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when member data reloads
  }, [userId, initialAccess])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleAccess: access }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Failed to save permissions')
      onSaved(payload.membership.moduleAccess)
      notify.success(`Permissions updated for ${memberName}`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (disabled) return null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-aqua/25 bg-theme-surface">
      <button
        type="button"
        onClick={() => {
          if (!open) setAccess(initialAccess ?? fallback)
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-theme-hover"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-theme-fg">Module permissions</p>
          <p className="truncate text-[11px] text-theme-muted">
            {open ? 'Click to collapse' : 'Click to set view / upload access'}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-aqua transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-theme px-3 pb-3 pt-3">
          <p className="mb-3 text-[11px] text-theme-muted">
            Choose what this member can see and edit. You can change this anytime.
          </p>
          <ModuleAccessCheckboxes access={access} onChange={setAccess} disabled={saving} />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-wyra rounded-lg px-3 py-1.5 text-xs"
            >
              {saving ? 'Saving…' : 'Save permissions'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
