import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getServerFirestore } from '@/lib/firestoreServer'
import {
  toStoredModuleAccess,
  type ModuleAccessMap,
  type ModuleId,
  type ModulePermission,
} from '@/lib/modulePermissions'

function requireFirestore() {
  const firestore = getServerFirestore()
  if (!firestore) {
    throw new Error(
      'Shared data storage is not configured. Add Firebase environment variables.',
    )
  }
  return firestore
}

function accessDocId(orgId: string, userId: string) {
  return `${orgId}__${userId}`
}

export async function getStoredModuleAccess(
  orgId: string,
  userId: string,
): Promise<ModuleAccessMap | null> {
  const firestore = requireFirestore()
  const snapshot = await getDoc(doc(firestore, 'user_module_access', accessDocId(orgId, userId)))
  if (!snapshot.exists()) return null
  const data = snapshot.data() as { moduleAccess?: unknown; organizationId?: string }
  if (data.organizationId && data.organizationId !== orgId) return null
  if (!data.moduleAccess || typeof data.moduleAccess !== 'object') return null
  return data.moduleAccess as ModuleAccessMap
}

export async function upsertStoredModuleAccess(args: {
  orgId: string
  userId: string
  moduleAccess: ModuleAccessMap
  updatedBy: string
}): Promise<Record<ModuleId, ModulePermission>> {
  const firestore = requireFirestore()
  const id = accessDocId(args.orgId, args.userId)
  const now = new Date().toISOString()
  const moduleAccess = toStoredModuleAccess(args.moduleAccess)

  // Firestore rejects `undefined`; store a plain full map of booleans only.
  const plainAccess: Record<string, { view: boolean; write: boolean }> = {}
  for (const [key, value] of Object.entries(moduleAccess)) {
    plainAccess[key] = { view: Boolean(value.view), write: Boolean(value.write) }
  }

  await setDoc(
    doc(firestore, 'user_module_access', id),
    {
      organizationId: args.orgId,
      userId: args.userId,
      moduleAccess: plainAccess,
      updatedAt: now,
      updatedBy: args.updatedBy,
      createdAt: now,
    },
    { merge: true },
  )
  return moduleAccess
}
