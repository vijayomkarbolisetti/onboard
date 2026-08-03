'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/Layout'
import { SingleOrgActivator } from '@/components/team/SingleOrgActivator'
import { InviteTicketRedirect } from '@/components/team/InviteTicketRedirect'
import { TeamInvitePanel } from '@/components/team/TeamInvitePanel'
import { Dashboard } from '@/components/onboarding/Dashboard'
import { Expenses } from '@/components/onboarding/Expenses'
import { OnboardingDetails } from '@/components/onboarding/OnboardingDetails'
import { OnboardingInvoices } from '@/components/onboarding/OnboardingInvoices'
import { OpenInvoices } from '@/components/onboarding/OpenInvoices'
import { PaidInvoices } from '@/components/onboarding/PaidInvoices'
import { collectCompanyNames } from '@/lib/companyNames'
import { useExpenses } from '@/hooks/useExpenses'
import { useOnboardingInvoices } from '@/hooks/useOnboardingInvoices'
import { useOnboardings } from '@/hooks/useOnboardings'
import { useOpenInvoices } from '@/hooks/useOpenInvoices'
import { usePaidInvoices } from '@/hooks/usePaidInvoices'
import { useTeamRole } from '@/hooks/useTeamRole'
import type { TabId } from '@/types'

const tabMeta: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Clients, invoices, amounts, and 6-month forecast',
  },
  onboarding: {
    title: 'Client Tracker',
    subtitle: 'Manage campaign leads, replies and status',
  },
  'onboarding-invoices': {
    title: 'Onboarding & Invoices',
    subtitle: 'Company details, agreements and invoice tracking',
  },
  'paid-invoices': {
    title: 'Paid Invoices',
    subtitle: 'Track completed payments and invoice records',
  },
  'open-invoices': {
    title: 'Open Invoices',
    subtitle: 'Manage outstanding and pending invoices',
  },
  expenses: {
    title: 'Expenses',
    subtitle: 'Tool subscriptions and card-based expenses',
  },
  team: {
    title: 'Team & Invites',
    subtitle: 'Invite teammates to your Wyra organization',
  },
}

export default function TrackerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const { canView, firstViewableModule, isLoaded: roleLoaded } = useTeamRole()

  const canOnboarding = roleLoaded && canView('onboarding')
  const canOnboardingInvoices = roleLoaded && canView('onboarding-invoices')
  const canPaidInvoices = roleLoaded && canView('paid-invoices')
  const canOpenInvoices = roleLoaded && canView('open-invoices')
  const canExpenses = roleLoaded && canView('expenses')

  const onboardingState = useOnboardings({ enabled: canOnboarding })
  const onboardingInvoicesState = useOnboardingInvoices({ enabled: canOnboardingInvoices })
  const paidInvoicesState = usePaidInvoices({ enabled: canPaidInvoices })
  const openInvoicesState = useOpenInvoices({ enabled: canOpenInvoices })
  const expensesState = useExpenses({ enabled: canExpenses })
  const meta = tabMeta[activeTab]

  useEffect(() => {
    if (!roleLoaded) return
    if (!canView(activeTab)) {
      setActiveTab(firstViewableModule('dashboard'))
    }
  }, [roleLoaded, activeTab, canView, firstViewableModule])

  const companyNames = useMemo(
    () =>
      collectCompanyNames([
        ...onboardingInvoicesState.records,
        ...onboardingState.onboardings,
      ]),
    [onboardingInvoicesState.records, onboardingState.onboardings],
  )

  useEffect(() => {
    if (!roleLoaded) return

    if (activeTab === 'dashboard') {
      if (canOnboarding) void onboardingState.reload()
      if (canOnboardingInvoices) void onboardingInvoicesState.reload()
      if (canPaidInvoices) void paidInvoicesState.reload()
      if (canOpenInvoices) void openInvoicesState.reload()
      if (canExpenses) void expensesState.reload()
    }
    if (activeTab === 'onboarding' && canOnboarding) {
      void onboardingState.reload()
    }
    if (activeTab === 'onboarding-invoices' && canOnboardingInvoices) {
      void onboardingInvoicesState.reload()
    }
    if (activeTab === 'paid-invoices' && canPaidInvoices) {
      void paidInvoicesState.reload()
    }
    if (activeTab === 'open-invoices' && canOpenInvoices) {
      void openInvoicesState.reload()
    }
    if (activeTab === 'expenses' && canExpenses) {
      void expensesState.reload()
    }
  }, [
    roleLoaded,
    activeTab,
    canOnboarding,
    canOnboardingInvoices,
    canPaidInvoices,
    canOpenInvoices,
    canExpenses,
    onboardingState.reload,
    onboardingInvoicesState.reload,
    paidInvoicesState.reload,
    openInvoicesState.reload,
    expensesState.reload,
  ])

  const dashboardLoading =
    !roleLoaded ||
    (canOnboarding && onboardingState.loading) ||
    (canOnboardingInvoices && onboardingInvoicesState.loading) ||
    (canPaidInvoices && paidInvoicesState.loading) ||
    (canOpenInvoices && openInvoicesState.loading) ||
    (canExpenses && expensesState.loading)

  const dashboardError =
    (canOnboarding && onboardingState.error) ||
    (canOnboardingInvoices && onboardingInvoicesState.error) ||
    (canPaidInvoices && paidInvoicesState.error) ||
    (canOpenInvoices && openInvoicesState.error) ||
    (canExpenses && expensesState.error) ||
    null

  const tabContent = (
    <>
      {activeTab === 'dashboard' && (
        <Dashboard
          onboardings={canOnboarding ? onboardingState.onboardings : []}
          onboardingInvoices={
            canOnboardingInvoices ? onboardingInvoicesState.records : []
          }
          paidInvoices={canPaidInvoices ? paidInvoicesState.invoices : []}
          openInvoices={canOpenInvoices ? openInvoicesState.invoices : []}
          expenses={canExpenses ? expensesState.expenses : []}
          loading={dashboardLoading}
          error={dashboardError}
        />
      )}

      {activeTab === 'onboarding' && (
        <OnboardingDetails
          onboardings={onboardingState.onboardings}
          loading={onboardingState.loading}
          error={onboardingState.error}
          onCreate={async (input) => {
            await onboardingState.add(input)
          }}
          onUpdate={onboardingState.update}
          onDelete={onboardingState.remove}
          onImport={async (inputs) => {
            await onboardingState.importMany(inputs)
          }}
        />
      )}

      {activeTab === 'onboarding-invoices' && (
        <OnboardingInvoices
          records={onboardingInvoicesState.records}
          loading={onboardingInvoicesState.loading}
          error={onboardingInvoicesState.error}
          onCreate={async (input) => {
            await onboardingInvoicesState.add(input)
          }}
          onUpdate={onboardingInvoicesState.update}
          onDelete={onboardingInvoicesState.remove}
          onImport={async (inputs) => {
            await onboardingInvoicesState.importMany(inputs)
          }}
        />
      )}

      {activeTab === 'paid-invoices' && (
        <PaidInvoices
          invoices={paidInvoicesState.invoices}
          loading={paidInvoicesState.loading}
          error={paidInvoicesState.error}
          companyNames={companyNames}
          onCreate={async (input) => {
            await paidInvoicesState.add(input)
          }}
          onUpdate={paidInvoicesState.update}
          onDelete={paidInvoicesState.remove}
          onImport={async (inputs) => {
            await paidInvoicesState.importMany(inputs)
          }}
        />
      )}

      {activeTab === 'open-invoices' && (
        <OpenInvoices
          invoices={openInvoicesState.invoices}
          loading={openInvoicesState.loading}
          error={openInvoicesState.error}
          companyNames={companyNames}
          onCreate={async (input) => {
            await openInvoicesState.add(input)
          }}
          onUpdate={openInvoicesState.update}
          onDelete={openInvoicesState.remove}
          onImport={async (inputs) => {
            await openInvoicesState.importMany(inputs)
          }}
        />
      )}

      {activeTab === 'expenses' && (
        <Expenses
          expenses={expensesState.expenses}
          loading={expensesState.loading}
          error={expensesState.error}
          onCreate={async (input) => {
            await expensesState.add(input)
          }}
          onUpdate={expensesState.update}
          onDelete={expensesState.remove}
          onImport={async (inputs) => {
            await expensesState.importMany(inputs)
          }}
        />
      )}

      {activeTab === 'team' && <TeamInvitePanel />}
    </>
  )

  return (
    <InviteTicketRedirect>
      <SingleOrgActivator>
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-theme-fg">{meta.title}</h1>
          <p className="mt-2 text-theme-muted">{meta.subtitle}</p>
        </div>

        {tabContent}
        </Layout>
      </SingleOrgActivator>
    </InviteTicketRedirect>
  )
}
