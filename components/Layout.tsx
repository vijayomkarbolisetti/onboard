'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import {
  CircleDollarSign,
  FileText,
  LogOut,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { WyraLogo } from '@/components/WyraLogo'
import { cn } from '@/lib/utils'
import type { TabId } from '@/types'

interface LayoutProps {
  children: ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const navItems: { id: TabId; label: string; icon: typeof Users }[] = [
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

function WyraUserMenu() {
  const { user, isLoaded } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [open, setOpen] = useState(false)
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
  )
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-theme bg-theme-sidebar shadow-sm lg:flex">
        <div className="border-b border-theme px-6 py-6">
          <WyraLogo priority />
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-theme-muted">
            Client Tracker
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
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
                <Icon size={18} />
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
            {navItems.map((item) => (
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
