import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getServerFirestore } from '@/lib/firestoreServer'

type OrgRecord = {
  id: string
  createdAt: string
  organizationId?: string
}

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function belongsToOrganization<T extends OrgRecord>(item: T, organizationId: string) {
  return !item.organizationId || item.organizationId === organizationId
}

function requireFirestore() {
  const firestore = getServerFirestore()
  if (!firestore) {
    throw new Error(
      'Shared data storage is not configured. Add Firebase environment variables.',
    )
  }
  return firestore
}

export function createOrgFirestoreStore<T extends OrgRecord>(
  collectionName: string,
) {
  return {
    async list(organizationId: string): Promise<T[]> {
      const firestore = requireFirestore()
      const snapshot = await getDocs(collection(firestore, collectionName))
      const items = snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          }) as T,
      )

      return sortByCreatedAt(items.filter((item) => belongsToOrganization(item, organizationId)))
    },

    async create(
      organizationId: string,
      input: Omit<T, 'id' | 'createdAt' | 'organizationId'>,
    ): Promise<T> {
      const firestore = requireFirestore()
      const record = {
        ...input,
        organizationId,
        createdAt: new Date().toISOString(),
      }

      const ref = await addDoc(collection(firestore, collectionName), record)
      return { id: ref.id, ...record } as T
    },

    async createMany(
      organizationId: string,
      inputs: Omit<T, 'id' | 'createdAt' | 'organizationId'>[],
    ): Promise<T[]> {
      if (inputs.length === 0) {
        return []
      }

      const firestore = requireFirestore()
      const createdAt = new Date().toISOString()
      const batch = writeBatch(firestore)
      const created: T[] = []

      inputs.forEach((input) => {
        const ref = doc(collection(firestore, collectionName))
        const record = {
          ...input,
          organizationId,
          createdAt,
        }
        batch.set(ref, record)
        created.push({ id: ref.id, ...record } as T)
      })

      await batch.commit()
      return created
    },

    async update(
      organizationId: string,
      id: string,
      input: Partial<Omit<T, 'id' | 'createdAt' | 'organizationId'>>,
    ): Promise<void> {
      const firestore = requireFirestore()
      const snapshot = await getDoc(doc(firestore, collectionName, id))
      if (!snapshot.exists()) {
        throw new Error('Record not found')
      }

      const existing = { id: snapshot.id, ...snapshot.data() } as T
      if (!belongsToOrganization(existing, organizationId)) {
        throw new Error('Record not found')
      }

      await updateDoc(doc(firestore, collectionName, id), {
        ...input,
        organizationId,
      })
    },

    async remove(organizationId: string, id: string): Promise<void> {
      const firestore = requireFirestore()
      const snapshot = await getDoc(doc(firestore, collectionName, id))
      if (!snapshot.exists()) {
        throw new Error('Record not found')
      }

      const existing = { id: snapshot.id, ...snapshot.data() } as T
      if (!belongsToOrganization(existing, organizationId)) {
        throw new Error('Record not found')
      }

      await deleteDoc(doc(firestore, collectionName, id))
    },
  }
}
