import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { getServerFirestore } from '@/lib/firestoreServer'
import {
  sanitizeModuleAccessInput,
  type ModuleAccessMap,
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

function pendingDocId(orgId: string, email: string) {
  return `${orgId}__${email.trim().toLowerCase()}`
}

export async function upsertPendingModuleAccess(args: {
  orgId: string
  email: string
  moduleAccess: ModuleAccessMap
  invitationId?: string
  updatedBy: string
}): Promise<void> {
  const firestore = requireFirestore()
  const email = args.email.trim().toLowerCase()
  const now = new Date().toISOString()
  await setDoc(
    doc(firestore, 'pending_module_access', pendingDocId(args.orgId, email)),
    {
      organizationId: args.orgId,
      email,
      moduleAccess: sanitizeModuleAccessInput(args.moduleAccess),
      invitationId: args.invitationId ?? null,
      updatedAt: now,
      updatedBy: args.updatedBy,
      createdAt: now,
    },
    { merge: true },
  )
}

export async function getPendingModuleAccess(
  orgId: string,
  email: string,
): Promise<ModuleAccessMap | null> {
  const firestore = requireFirestore()
  const snapshot = await getDoc(
    doc(firestore, 'pending_module_access', pendingDocId(orgId, email)),
  )
  if (!snapshot.exists()) return null
  const data = snapshot.data() as { moduleAccess?: unknown; organizationId?: string }
  if (data.organizationId && data.organizationId !== orgId) return null
  if (!data.moduleAccess || typeof data.moduleAccess !== 'object') return null
  return sanitizeModuleAccessInput(data.moduleAccess)
}

export async function deletePendingModuleAccess(orgId: string, email: string): Promise<void> {
  const firestore = requireFirestore()
  await deleteDoc(doc(firestore, 'pending_module_access', pendingDocId(orgId, email)))
}
