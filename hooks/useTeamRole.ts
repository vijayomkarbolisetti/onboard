'use client'

import { useOrganization } from '@clerk/nextjs'

export function useTeamRole() {
  const { membership, isLoaded } = useOrganization()
  const isAdmin = isLoaded && membership?.role === 'org:admin'

  return {
    isLoaded,
    isAdmin,
    canWrite: isAdmin,
  }
}
