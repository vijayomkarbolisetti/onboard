'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/Layout'
import { SingleOrgActivator } from '@/components/team/SingleOrgActivator'
import { InviteTicketRedirect } from '@/components/team/InviteTicketRedirect'
import { TeamInvitePanel } from '@/components/team/TeamInvitePanel'
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
import type { TabId } from '@/types'

const tabMeta: Record<TabId, { title: string; subtitle: string }> = {
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
  const [activeTab, setActiveTab] = useState<TabId>('onboarding')
  const onboardingState = useOnboardings()
  const onboardingInvoicesState = useOnboardingInvoices()
  const paidInvoicesState = usePaidInvoices()
  const openInvoicesState = useOpenInvoices()
  const expensesState = useExpenses()
  const meta = tabMeta[activeTab]

  const companyNames = useMemo(
    () =>
      collectCompanyNames([
        ...onboardingInvoicesState.records,
        ...onboardingState.onboardings,
      ]),
    [onboardingInvoicesState.records, onboardingState.onboardings],
  )

  useEffect(() => {
    if (activeTab === 'onboarding') {
      void onboardingState.reload()
    }
    if (activeTab === 'onboarding-invoices') {
      void onboardingInvoicesState.reload()
    }
    if (activeTab === 'paid-invoices') {
      void paidInvoicesState.reload()
    }
    if (activeTab === 'open-invoices') {
      void openInvoicesState.reload()
    }
    if (activeTab === 'expenses') {
      void expensesState.reload()
    }
  }, [
    activeTab,
    onboardingState.reload,
    onboardingInvoicesState.reload,
    paidInvoicesState.reload,
    openInvoicesState.reload,
    expensesState.reload,
  ])

  const tabContent = (
    <>
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
