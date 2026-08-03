'use client'

import { useOrganization } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import {
  canViewModule,
  canWriteModule,
  firstViewableModule,
  normalizeModuleAccess,
  type ModuleId,
  type ModulePermission,
} from '@/lib/modulePermissions'

export function useTeamRole() {
  const { membership, isLoaded: orgLoaded } = useOrganization()
  const clerkIsAdmin = orgLoaded && membership?.role === 'org:admin'

  const [moduleAccess, setModuleAccess] = useState(() =>
    normalizeModuleAccess(null, Boolean(clerkIsAdmin)),
  )
  const [isAdmin, setIsAdmin] = useState(Boolean(clerkIsAdmin))
  const [accessLoaded, setAccessLoaded] = useState(false)

  const reloadAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/team/me/access')
      if (!res.ok) {
        setModuleAccess(normalizeModuleAccess(null, Boolean(clerkIsAdmin)))
        setIsAdmin(Boolean(clerkIsAdmin))
        return
      }
      const payload = (await res.json()) as {
        isAdmin?: boolean
        moduleAccess?: Record<ModuleId, ModulePermission>
      }
      const admin = Boolean(payload.isAdmin ?? clerkIsAdmin)
      setIsAdmin(admin)
      setModuleAccess(
        payload.moduleAccess
          ? normalizeModuleAccess(payload.moduleAccess, admin)
          : normalizeModuleAccess(null, admin),
      )
    } catch {
      setModuleAccess(normalizeModuleAccess(null, Boolean(clerkIsAdmin)))
      setIsAdmin(Boolean(clerkIsAdmin))
    } finally {
      setAccessLoaded(true)
    }
  }, [clerkIsAdmin])

  useEffect(() => {
    if (!orgLoaded) return
    void reloadAccess()
  }, [orgLoaded, membership?.role, reloadAccess])

  const isLoaded = orgLoaded && accessLoaded

  return {
    isLoaded,
    isAdmin,
    reloadAccess,
    /** Legacy: true only for org admins. Prefer canWriteModule(moduleId). */
    canWrite: Boolean(isAdmin),
    moduleAccess,
    canView: (moduleId: ModuleId) =>
      Boolean(isAdmin) || canViewModule(moduleAccess, moduleId),
    canWriteModule: (moduleId: ModuleId) =>
      Boolean(isAdmin) || canWriteModule(moduleAccess, moduleId),
    firstViewableModule: (preferred?: ModuleId) =>
      firstViewableModule(moduleAccess, preferred ?? 'dashboard'),
    permissionFor: (moduleId: ModuleId): ModulePermission =>
      moduleAccess[moduleId] ?? { view: false, write: false },
  }
}
