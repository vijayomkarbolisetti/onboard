'use client'

import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import {
  CircleDollarSign,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { WyraLogo } from '@/components/WyraLogo'
import { notify } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { TabId } from '@/types'

interface LayoutProps {
  children: ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  canViewTab: (tab: TabId) => boolean
  permissionsLoaded: boolean
}

const navItems: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'onboarding', label: 'Client Tracker', icon: Users },
  { id: 'onboarding-invoices', label: 'Onboarding & Invoices', icon: Receipt },
  { id: 'paid-invoices', label: 'Paid Invoices', icon: CircleDollarSign },
  { id: 'open-invoices', label: 'Open Invoices', icon: FileText },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'team', label: 'Team & Invites', icon: UserPlus },
]

function getUserInitials(firstName?: string | null, lastName?: string | null, email?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }
  return email?.charAt(0).toUpperCase() ?? 'U'
}

async function revokeOtherSessions() {
  const res = await fetch('/api/account/revoke-other-sessions', { method: 'POST' })
  const payload = (await res.json().catch(() => ({}))) as { error?: string; revokedCount?: number }
  if (!res.ok) {
    throw new Error(payload.error ?? 'Failed to sign out other devices')
  }
  return payload.revokedCount ?? 0
}

/** When password change revokes this session remotely, kick to sign-in quickly. */
function SessionValidityWatcher() {
  const { getToken, isSignedIn } = useAuth()
  const { signOut } = useClerk()

  useEffect(() => {
    if (!isSignedIn) return

    let cancelled = false

    const check = async () => {
      try {
        const token = await getToken({ skipCache: true })
        if (!cancelled && !token) {
          await signOut({ redirectUrl: '/sign-in' })
        }
      } catch {
        if (!cancelled) {
          await signOut({ redirectUrl: '/sign-in' })
        }
      }
    }

    void check()
    const id = window.setInterval(() => void check(), 20_000)
    const onFocus = () => void check()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [getToken, isSignedIn, signOut])

  return null
}

function UpdatePasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSubmitting(false)
  }, [open])

  if (!open) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    if (newPassword.length < 8) {
      notify.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      notify.error('New password and confirm password do not match')
      return
    }

    setSubmitting(true)
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      })

      try {
        const revokedCount = await revokeOtherSessions()
        notify.success(
          revokedCount > 0
            ? `Password updated. Signed out of ${revokedCount} other device(s).`
            : 'Password updated. Other devices will be signed out.',
        )
      } catch {
        notify.success('Password updated. Other sessions were marked for sign-out.')
      }

      onClose()
    } catch (err) {
      const clerkErrors = (
        err as { errors?: Array<{ longMessage?: string; message?: string }> } | null
      )?.errors
      const message =
        clerkErrors?.[0]?.longMessage ||
        clerkErrors?.[0]?.message ||
        (err instanceof Error ? err.message : 'Failed to update password')
      notify.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="fixed inset-0 theme-overlay backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onClose()
        }}
        aria-label="Close update password"
      />
      <div className="relative my-auto flex w-full max-w-xl max-h-[min(90vh,720px)] flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-theme-fg">Update password</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Other signed-in devices will be signed out automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg disabled:opacity-60"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <label className="block space-y-2">
              <span className="wyra-label">Current password</span>
              <input
                type="password"
                className="wyra-input"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="wyra-label">New password</span>
                <input
                  type="password"
                  className="wyra-input"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </label>
              <label className="block space-y-2">
                <span className="wyra-label">Confirm password</span>
                <input
                  type="password"
                  className="wyra-input"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Re-enter new password"
                />
              </label>
            </div>

            <p className="rounded-xl border border-aqua/30 bg-aqua/5 px-4 py-3 text-xs leading-relaxed text-theme-body">
              Saving will sign out all other devices that are currently logged in with this
              account.
            </p>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-theme px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover disabled:opacity-60"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-wyra disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save & sign out others'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WyraUserMenu() {
  const { user, isLoaded } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  if (!isLoaded) {
    return <div className="h-10 w-10 rounded-full bg-theme-elevated" aria-hidden />
  }

  if (!user) {
    return null
  }

  const email = user.primaryEmailAddress?.emailAddress ?? 'Account'
  const initials = getUserInitials(user.firstName, user.lastName, email)

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-theme bg-theme-elevated transition hover:border-aqua/40"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Open account menu"
        >
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="bg-wyra-gradient text-xs font-bold text-white">{initials}</span>
          )}
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-theme bg-theme-modal shadow-[var(--theme-modal-shadow)]"
          >
            <div className="flex items-center gap-3 border-b border-theme px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme bg-theme-elevated">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="bg-wyra-gradient flex h-full w-full items-center justify-center text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-medium text-theme-fg">{email}</p>
            </div>

            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  openUserProfile()
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-body transition hover:bg-theme-hover hover:text-theme-fg"
              >
                <Settings size={16} />
                Manage account
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  setPasswordOpen(true)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-body transition hover:bg-theme-hover hover:text-theme-fg"
              >
                <KeyRound size={16} />
                Update password
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  void signOut({ redirectUrl: '/sign-in' })
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-theme-body transition hover:bg-theme-hover hover:text-theme-fg"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <UpdatePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}

export function Layout({
  children,
  activeTab,
  onTabChange,
  canViewTab,
  permissionsLoaded,
}: LayoutProps) {
  const visibleNavItems = navItems.filter((item) => !permissionsLoaded || canViewTab(item.id))

  return (
    <div className="min-h-screen">
      <SessionValidityWatcher />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-theme bg-theme-sidebar shadow-sm lg:flex">
        <div className="border-b border-theme px-6 py-6">
          <WyraLogo priority />
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-theme-muted">
            Client Tracker
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'btn-wyra-nav'
                    : 'text-theme-muted hover:bg-theme-hover hover:text-theme-fg',
                )}
              >
                <Icon size={18} aria-hidden />
                <span className="text-left leading-snug">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="lg:pl-[280px] min-w-0">
        <header className="sticky top-0 z-20 border-b border-theme bg-theme-sidebar px-4 py-4 shadow-sm lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <WyraLogo width={110} height={36} className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <WyraUserMenu />
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                  activeTab === item.id
                    ? 'btn-wyra-nav'
                    : 'border border-theme bg-theme-surface text-theme-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <header className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-theme bg-theme-sidebar/95 px-8 py-3 backdrop-blur-sm lg:flex">
          <ThemeToggle />
          <WyraUserMenu />
        </header>

        <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
