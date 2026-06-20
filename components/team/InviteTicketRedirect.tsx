'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, Suspense, useEffect } from 'react'

function inviteTargetPath(status: string | null) {
  return status === 'sign_in' ? '/sign-in' : '/sign-up'
}

function InviteRedirectHandler({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticket = searchParams.get('__clerk_ticket')

  useEffect(() => {
    if (!ticket) {
      return
    }

    const status = searchParams.get('__clerk_status')
    const query = searchParams.toString()
    const target = inviteTargetPath(status)
    router.replace(query ? `${target}?${query}` : target)
  }, [ticket, searchParams, router])

  if (ticket) {
    return null
  }

  return <>{children}</>
}

export function InviteTicketRedirect({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <InviteRedirectHandler>{children}</InviteRedirectHandler>
    </Suspense>
  )
}
