'use client'

import { useAuth, useOrganizationList, useUser } from '@clerk/nextjs'
import { Loader2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { WyraLogo } from '@/components/WyraLogo'

type OrganizationPayload = {
  organization?: { id: string; name: string } | null
  membership?: { role: string } | null
  canBootstrap?: boolean
  organizationName?: string
  error?: string
}

const SETUP_TIMEOUT_MS = 12_000

async function activateOrganization(
  setActive: ReturnType<typeof useOrganizationList>['setActive'],
  organizationId: string,
) {
  if (!setActive) {
    throw new Error('Organization activation is unavailable')
  }

  await Promise.race([
    setActive({ organization: organizationId }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Organization activation timed out')), SETUP_TIMEOUT_MS)
    }),
  ])

  window.location.assign('/')
}

export default function ChooseOrganizationPage() {
  const { isLoaded: authLoaded } = useAuth({ treatPendingAsSignedOut: false })
  const { user } = useUser()
  const { setActive, isLoaded: listLoaded, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState('Wyra')
  const [statusMessage, setStatusMessage] = useState('Setting up Wyra workspace…')

  useEffect(() => {
    if (!authLoaded || !listLoaded) {
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setBlockedMessage(
          'Setup is taking longer than expected. Refresh the page or sign out and try again.',
        )
      }
    }, SETUP_TIMEOUT_MS + 2_000)

    async function completeOrganizationTask() {
      try {
        const memberships = userMemberships.data ?? []

        if (memberships.length > 0) {
          setStatusMessage('Activating your workspace…')
          await activateOrganization(setActive, memberships[0].organization.id)
          return
        }

        setStatusMessage('Checking organization…')
        const response = await fetch('/api/team/organization')
        const payload = (await response.json()) as OrganizationPayload

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load organization')
        }

        const name = payload.organizationName ?? payload.organization?.name ?? 'Wyra'
        if (!cancelled) {
          setOrganizationName(name)
        }

        if (payload.organization && payload.membership) {
          setStatusMessage('Activating your workspace…')
          await activateOrganization(setActive, payload.organization.id)
          return
        }

        if (payload.organization && !payload.membership) {
          if (!cancelled) {
            setBlockedMessage(
              `You need an invite from a ${name} admin before you can access the tracker.`,
            )
          }
          return
        }

        if (payload.canBootstrap) {
          setStatusMessage('Creating Wyra workspace…')
          const createResponse = await fetch('/api/team/organization', { method: 'POST' })
          const createPayload = (await createResponse.json()) as OrganizationPayload

          if (!createResponse.ok) {
            throw new Error(createPayload.error ?? 'Failed to initialize organization')
          }

          const orgId = createPayload.organization?.id
          if (!orgId) {
            throw new Error('Organization was not created')
          }

          setStatusMessage('Activating your workspace…')
          await activateOrganization(setActive, orgId)
          return
        }

        if (!cancelled) {
          setBlockedMessage(
            `You need an invite from a ${name} admin before you can access the tracker.`,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setBlockedMessage(
            error instanceof Error ? error.message : 'Unable to complete organization setup',
          )
        }
      }
    }

    void completeOrganizationTask()

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [authLoaded, listLoaded, setActive, userMemberships.data])

  if (blockedMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <WyraLogo priority width={160} height={48} />
        <div className="mt-10 max-w-md rounded-2xl border border-theme bg-theme-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua/10">
            <Mail className="text-aqua" size={28} />
          </div>
          <h1 className="mt-5 text-xl font-bold text-theme-fg">Invitation required</h1>
          <p className="mt-3 text-sm text-theme-muted">{blockedMessage}</p>
          {user?.primaryEmailAddress?.emailAddress && (
            <p className="mt-4 text-xs text-theme-muted">
              Signed in as {user.primaryEmailAddress.emailAddress}
            </p>
          )}
          <p className="mt-6 text-xs text-theme-muted">
            Ask your {organizationName} admin to send you a team invite, then sign in again using
            that email link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <WyraLogo priority width={160} height={48} />
      <div className="mt-10 flex items-center gap-3 text-theme-muted">
        <Loader2 className="animate-spin text-aqua" size={22} />
        <p className="text-sm">{statusMessage}</p>
      </div>
    </div>
  )
}
