'use client'

import { useOrganization } from '@clerk/nextjs'
import { Loader2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { notify } from '@/lib/toast'
import type { TabId } from '@/types'

interface SidebarInviteSectionProps {
  onTabChange: (tab: TabId) => void
}

export function SidebarInviteSection({ onTabChange }: SidebarInviteSectionProps) {
  const { organization, membership, isLoaded } = useOrganization()
  const [organizationName, setOrganizationName] = useState('Wyra')
  const [isMember, setIsMember] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const isAdmin = membership?.role === 'org:admin'

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    void fetch('/api/team/organization')
      .then((res) => res.json())
      .then((payload) => {
        setOrganizationName(payload.organizationName ?? payload.organization?.name ?? 'Wyra')
        setIsMember(Boolean(payload.membership))
      })
      .catch(() => {
        // Sidebar stays usable even if org metadata fails to load.
      })
  }, [isLoaded, organization?.id])

  const handleQuickInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress: email.trim(), role: 'org:member' }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to send invitation')
      }

      setEmail('')
      notify.success('Invite sent')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="border-t border-theme px-4 py-4">
        <div className="flex justify-center py-2">
          <Loader2 className="animate-spin text-theme-muted" size={18} />
        </div>
      </div>
    )
  }

  const displayName = organization?.name ?? organizationName

  return (
    <div className="border-t border-theme px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-theme-muted">
        Team
      </p>

      <div className="mt-3 space-y-2">
        <p className="truncate text-sm font-semibold text-theme-fg">{displayName}</p>

        {isMember && isAdmin ? (
          <form onSubmit={handleQuickInvite} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Invite by email"
              className="wyra-input w-full text-sm"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="btn-wyra w-full justify-center text-sm"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Mail size={14} />
              )}
              Send invite
            </button>
          </form>
        ) : isMember ? (
          <p className="text-xs text-theme-muted">Ask an admin to invite new teammates.</p>
        ) : (
          <p className="text-xs text-theme-muted">Invite required to join this organization.</p>
        )}

        <button
          type="button"
          onClick={() => onTabChange('team')}
          className="w-full text-left text-xs font-semibold text-aqua transition hover:text-aqua-dark"
        >
          Manage team →
        </button>
      </div>
    </div>
  )
}
