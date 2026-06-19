'use client'

import { UserButton } from '@clerk/nextjs'
import {
  CircleDollarSign,
  FileText,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
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
]

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
              <UserButton />
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
          <UserButton />
        </header>

        <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
