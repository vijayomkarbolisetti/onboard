'use client'

import { useOrganization, useOrganizationList, useUser } from '@clerk/nextjs'
import {
  Building2,
  Clock3,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'

type TeamMember = {
  id: string
  userId?: string
  firstName: string
  lastName: string
  imageUrl: string
  identifier: string
  role: string
}

type TeamInvitation = {
  id: string
  emailAddress: string
  role: string
  status: string
  createdAt: number
}

function memberLabel(member: TeamMember) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return name || member.identifier
}

function roleLabel(role: string) {
  return role === 'org:admin' ? 'Admin' : 'Member'
}

export function TeamInvitePanel() {
  const { organization, membership, isLoaded: orgLoaded } = useOrganization()
  const { user } = useUser()
  const { setActive } = useOrganizationList({ userMemberships: { infinite: true } })

  const [organizationName, setOrganizationName] = useState('Wyra')
  const [canBootstrap, setCanBootstrap] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'org:member' | 'org:admin'>('org:member')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  const isAdmin = membership?.role === 'org:admin'

  const loadOrganizationState = useCallback(async () => {
    try {
      const response = await fetch('/api/team/organization')
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load organization')
      }

      setOrganizationName(payload.organizationName ?? payload.organization?.name ?? 'Wyra')
      setCanBootstrap(Boolean(payload.canBootstrap))
      setIsMember(Boolean(payload.membership))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to load organization')
    }
  }, [])

  const loadTeamData = useCallback(async () => {
    if (!organization || !isMember) {
      setMembers([])
      setInvitations([])
      return
    }

    setLoadingTeam(true)

    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/invitations'),
      ])

      const membersPayload = await membersRes.json()
      const invitationsPayload = await invitationsRes.json()

      if (!membersRes.ok) {
        throw new Error(membersPayload.error ?? 'Failed to load members')
      }
      if (!invitationsRes.ok) {
        throw new Error(invitationsPayload.error ?? 'Failed to load invitations')
      }

      setMembers(membersPayload.members ?? [])
      setInvitations(invitationsPayload.invitations ?? [])
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to load team data')
    } finally {
      setLoadingTeam(false)
    }
  }, [organization, isMember])

  useEffect(() => {
    if (orgLoaded) {
      void loadOrganizationState()
    }
  }, [orgLoaded, loadOrganizationState])

  useEffect(() => {
    if (orgLoaded && organization && isMember) {
      void loadTeamData()
    }
  }, [orgLoaded, organization, isMember, loadTeamData])

  const handleBootstrap = async () => {
    setBootstrapping(true)

    try {
      const response = await fetch('/api/team/organization', { method: 'POST' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to initialize organization')
      }

      await setActive?.({ organization: payload.organization.id })
      notify.success(`${organizationName} is ready.`)
      await loadOrganizationState()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to initialize organization')
    } finally {
      setBootstrapping(false)
    }
  }

  const handleSendInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!inviteEmail.trim()) {
      notify.error('Email address is required')
      return
    }

    setSendingInvite(true)

    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddress: inviteEmail.trim(),
          role: inviteRole,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to send invitation')
      }

      setInviteEmail('')
      notify.success(`Invitation sent to ${payload.invitation.emailAddress}`)
      await loadTeamData()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to revoke invitation')
      }

      notify.success('Invitation revoked')
      await loadTeamData()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to revoke invitation')
    }
  }

  const handleRemoveMember = async (member: TeamMember) => {
    if (!member.userId) {
      notify.error('Cannot remove this member')
      return
    }

    if (member.userId === user?.id) {
      notify.error('You cannot remove yourself from the organization')
      return
    }

    const confirmed = window.confirm(
      `Remove ${memberLabel(member)} from ${displayOrgName}?`,
    )
    if (!confirmed) {
      return
    }

    setRemovingUserId(member.userId)

    try {
      const response = await fetch(`/api/team/members/${member.userId}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to remove team member')
      }

      notify.success('Team member removed')
      await loadTeamData()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      setRemovingUserId(null)
    }
  }

  if (!orgLoaded) {
    return (
      <div className="content-shell flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-aqua" size={28} />
      </div>
    )
  }

  if (canBootstrap) {
    return (
      <div className="content-shell overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
        <div className="p-5 sm:p-8">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-aqua/10">
              <Building2 className="text-aqua" size={32} />
            </div>
            <h3 className="mt-5 text-xl font-bold text-theme-fg">Initialize {organizationName}</h3>
            <p className="mt-2 text-sm text-theme-muted">
              This app uses a single organization. The first admin can set it up once for the whole
              team.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-md">
            <button
              type="button"
              onClick={() => void handleBootstrap()}
              disabled={bootstrapping}
              className="btn-wyra w-full"
            >
              {bootstrapping ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Building2 size={16} />
              )}
              Initialize organization
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="content-shell overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold text-theme-fg">Invitation required</h3>
          <p className="mt-2 text-sm text-theme-muted">
            You need an invite from an admin to join {organizationName}.
          </p>
        </div>
      </div>
    )
  }

  const displayOrgName = organization?.name ?? organizationName

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="content-shell overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua/10">
                <UserPlus className="text-aqua" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-fg">Invite teammate</h3>
                <p className="text-sm text-theme-muted">
                  Send a secure email invitation to join {displayOrgName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendInvite} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
              <label className="block sm:col-span-1">
                <span className="wyra-label">Email address</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="wyra-input mt-2 w-full"
                />
              </label>

              <label className="block">
                <span className="wyra-label">Role</span>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as 'org:member' | 'org:admin')
                  }
                  className="wyra-input mt-2 w-full min-w-[140px]"
                >
                  <option value="org:member">Member</option>
                  <option value="org:admin">Admin</option>
                </select>
              </label>

              <div className="flex items-end">
                <button type="submit" disabled={sendingInvite} className="btn-wyra w-full sm:w-auto">
                  {sendingInvite ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                  Send invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="content-shell overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
          <div className="p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <Users size={18} className="text-aqua" />
              <h3 className="text-lg font-semibold text-theme-fg">Team members</h3>
              <span className="rounded-full bg-theme-hover px-2.5 py-0.5 text-xs font-semibold text-theme-muted">
                {members.length}
              </span>
            </div>

            {loadingTeam ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-aqua" size={24} />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-theme-muted">No members found.</p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-theme-hover px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {member.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.imageUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-aqua/15 text-sm font-bold text-aqua">
                          {memberLabel(member).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-theme-fg">
                          {memberLabel(member)}
                        </p>
                        <p className="truncate text-xs text-theme-muted">{member.identifier}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                          member.role === 'org:admin'
                            ? 'bg-aqua/15 text-aqua'
                            : 'bg-theme-surface text-theme-muted',
                        )}
                      >
                        {member.role === 'org:admin' && <Shield size={12} />}
                        {roleLabel(member.role)}
                      </span>
                      {isAdmin && member.userId && member.userId !== user?.id && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member)}
                          disabled={removingUserId === member.userId}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingUserId === member.userId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="content-shell overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
          <div className="p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 size={18} className="text-lime" />
              <h3 className="text-lg font-semibold text-theme-fg">Pending invitations</h3>
              <span className="rounded-full bg-theme-hover px-2.5 py-0.5 text-xs font-semibold text-theme-muted">
                {invitations.length}
              </span>
            </div>

            {loadingTeam ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-aqua" size={24} />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-theme-muted">No pending invitations.</p>
            ) : (
              <ul className="space-y-3">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-theme-hover px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-theme-fg">
                        {invitation.emailAddress}
                      </p>
                      <p className="text-xs text-theme-muted">
                        {roleLabel(invitation.role)} · Pending
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleRevokeInvite(invitation.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                        title="Revoke invitation"
                      >
                        <X size={14} />
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
