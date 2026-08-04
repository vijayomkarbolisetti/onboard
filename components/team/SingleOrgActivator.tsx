'use client'

import { useOrganization, useOrganizationList } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

interface SingleOrgActivatorProps {
  children: ReactNode
}

/**
 * Ensures the app's single Clerk organization is active in the session.
 */
export function SingleOrgActivator({ children }: SingleOrgActivatorProps) {
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const { setActive, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!orgLoaded || !listLoaded) {
      return
    }

    setReady(true)

    async function syncOrganization() {
      try {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 2500)
        const response = await fetch('/api/team/organization', {
          signal: controller.signal,
          cache: 'no-store',
        })
        window.clearTimeout(timeout)
        const payload = await response.json()
        const targetOrgId = payload.organization?.id as string | undefined

        if (!targetOrgId) {
          return
        }

        if (organization?.id !== targetOrgId) {
          await setActive?.({ organization: targetOrgId })
        }
      } catch {
        // Non-members and pre-bootstrap states are handled in team UI.
      }
    }

    void syncOrganization()

  }, [orgLoaded, listLoaded, organization?.id, setActive])

  if (!orgLoaded || !listLoaded || !ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-aqua" size={28} />
      </div>
    )
  }

  return <>{children}</>
}
