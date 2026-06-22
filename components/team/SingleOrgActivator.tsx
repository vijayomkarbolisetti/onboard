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

    let cancelled = false

    async function syncOrganization() {
      try {
        const response = await fetch('/api/team/organization')
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
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }

    void syncOrganization()

    return () => {
      cancelled = true
    }
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
