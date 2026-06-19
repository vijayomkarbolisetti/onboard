import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'
import type {
  CreateInvoiceInput,
  CreateOnboardingInput,
  CreateOnboardingInvoiceInput,
  CreateExpenseInput,
  CreateOpenInvoiceInput,
  CreatePaidInvoiceInput,
  Expense,
  Invoice,
  Onboarding,
  OnboardingInvoiceRecord,
  OpenInvoice,
  PaidInvoice,
} from '@/types'

const ONBOARDINGS_KEY = 'wyra_onboardings'
const INVOICES_KEY = 'wyra_invoices'
const ONBOARDING_INVOICES_KEY = 'wyra_onboarding_invoices'
const PAID_INVOICES_KEY = 'wyra_paid_invoices'
const OPEN_INVOICES_KEY = 'wyra_open_invoices'
const EXPENSES_KEY = 'wyra_expenses'
const REQUEST_TIMEOUT_MS = 12_000

function readLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function writeLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function generateId() {
  return crypto.randomUUID()
}

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `${label} timed out. Confirm Firestore is enabled in Firebase Console.`,
          ),
        )
      }, REQUEST_TIMEOUT_MS)
    }),
  ])
}

export async function fetchOnboardings(): Promise<Onboarding[]> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const snapshot = await withTimeout(
      getDocs(collection(firestore, 'onboardings')),
      'Loading onboardings',
    )
    return sortByCreatedAt(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Onboarding[],
    )
  }

  return sortByCreatedAt(readLocal<Onboarding>(ONBOARDINGS_KEY))
}

export async function createOnboarding(
  input: CreateOnboardingInput,
): Promise<Onboarding> {
  const record: Omit<Onboarding, 'id'> = {
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const ref = await withTimeout(
      addDoc(collection(firestore, 'onboardings'), record),
      'Creating onboarding',
    )
    return { id: ref.id, ...record }
  }

  const onboarding: Onboarding = { id: generateId(), ...record }
  const existing = readLocal<Onboarding>(ONBOARDINGS_KEY)
  writeLocal(ONBOARDINGS_KEY, [onboarding, ...existing])
  return onboarding
}

export async function updateOnboarding(
  id: string,
  input: CreateOnboardingInput,
): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      updateDoc(doc(firestore, 'onboardings', id), {
        organization: input.organization,
        onboardingDate: input.onboardingDate,
        campaignLaunchDate: input.campaignLaunchDate,
        remarks: input.remarks,
      }),
      'Updating onboarding',
    )
    return
  }

  const existing = readLocal<Onboarding>(ONBOARDINGS_KEY)
  writeLocal(
    ONBOARDINGS_KEY,
    existing.map((item) =>
      item.id === id
        ? {
            ...item,
            organization: input.organization,
            onboardingDate: input.onboardingDate,
            campaignLaunchDate: input.campaignLaunchDate,
            remarks: input.remarks,
          }
        : item,
    ),
  )
}

export async function updateOnboardingStatus(
  id: string,
  status: Onboarding['status'],
): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      updateDoc(doc(firestore, 'onboardings', id), { status }),
      'Updating onboarding',
    )
    return
  }

  const existing = readLocal<Onboarding>(ONBOARDINGS_KEY)
  writeLocal(
    ONBOARDINGS_KEY,
    existing.map((item) => (item.id === id ? { ...item, status } : item)),
  )
}

export async function deleteOnboarding(id: string): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      deleteDoc(doc(firestore, 'onboardings', id)),
      'Deleting onboarding',
    )
    return
  }

  writeLocal(
    ONBOARDINGS_KEY,
    readLocal<Onboarding>(ONBOARDINGS_KEY).filter((item) => item.id !== id),
  )
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const snapshot = await withTimeout(
      getDocs(collection(firestore, 'invoices')),
      'Loading invoices',
    )
    return sortByCreatedAt(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Invoice[],
    )
  }

  return sortByCreatedAt(readLocal<Invoice>(INVOICES_KEY))
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const record: Omit<Invoice, 'id'> = {
    ...input,
    createdAt: new Date().toISOString(),
  }

  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const ref = await withTimeout(
      addDoc(collection(firestore, 'invoices'), record),
      'Creating invoice',
    )
    return { id: ref.id, ...record }
  }

  const invoice: Invoice = { id: generateId(), ...record }
  const existing = readLocal<Invoice>(INVOICES_KEY)
  writeLocal(INVOICES_KEY, [invoice, ...existing])
  return invoice
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice['status'],
): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      updateDoc(doc(firestore, 'invoices', id), { status }),
      'Updating invoice',
    )
    return
  }

  const existing = readLocal<Invoice>(INVOICES_KEY)
  writeLocal(
    INVOICES_KEY,
    existing.map((item) => (item.id === id ? { ...item, status } : item)),
  )
}

export function getStorageMode(): 'firebase' | 'local' {
  return isFirebaseConfigured ? 'firebase' : 'local'
}

export async function fetchOnboardingInvoices(): Promise<OnboardingInvoiceRecord[]> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const snapshot = await withTimeout(
      getDocs(collection(firestore, 'onboarding_invoices')),
      'Loading onboarding & invoices',
    )
    return sortByCreatedAt(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as OnboardingInvoiceRecord[],
    )
  }

  return sortByCreatedAt(readLocal<OnboardingInvoiceRecord>(ONBOARDING_INVOICES_KEY))
}

export async function createOnboardingInvoice(
  input: CreateOnboardingInvoiceInput,
): Promise<OnboardingInvoiceRecord> {
  const record: Omit<OnboardingInvoiceRecord, 'id'> = {
    ...input,
    createdAt: new Date().toISOString(),
  }

  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    const ref = await withTimeout(
      addDoc(collection(firestore, 'onboarding_invoices'), record),
      'Creating record',
    )
    return { id: ref.id, ...record }
  }

  const item: OnboardingInvoiceRecord = { id: generateId(), ...record }
  const existing = readLocal<OnboardingInvoiceRecord>(ONBOARDING_INVOICES_KEY)
  writeLocal(ONBOARDING_INVOICES_KEY, [item, ...existing])
  return item
}

export async function updateOnboardingInvoice(
  id: string,
  input: CreateOnboardingInvoiceInput,
): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      updateDoc(
        doc(firestore, 'onboarding_invoices', id),
        input as unknown as Record<string, unknown>,
      ),
      'Updating record',
    )
    return
  }

  const existing = readLocal<OnboardingInvoiceRecord>(ONBOARDING_INVOICES_KEY)
  writeLocal(
    ONBOARDING_INVOICES_KEY,
    existing.map((item) => (item.id === id ? { ...item, ...input } : item)),
  )
}

export async function deleteOnboardingInvoice(id: string): Promise<void> {
  const firestore = getDb()
  if (isFirebaseConfigured && firestore) {
    await withTimeout(
      deleteDoc(doc(firestore, 'onboarding_invoices', id)),
      'Deleting record',
    )
    return
  }

  writeLocal(
    ONBOARDING_INVOICES_KEY,
    readLocal<OnboardingInvoiceRecord>(ONBOARDING_INVOICES_KEY).filter(
      (item) => item.id !== id,
    ),
  )
}

export async function createOnboardingInvoicesBulk(
  inputs: CreateOnboardingInvoiceInput[],
): Promise<OnboardingInvoiceRecord[]> {
  if (inputs.length === 0) return []

  const createdAt = new Date().toISOString()
  const firestore = getDb()

  if (isFirebaseConfigured && firestore) {
    const batch = writeBatch(firestore)
    const created: OnboardingInvoiceRecord[] = []

    inputs.forEach((input) => {
      const ref = doc(collection(firestore, 'onboarding_invoices'))
      const record: OnboardingInvoiceRecord = {
        id: ref.id,
        ...input,
        createdAt,
      }
      batch.set(ref, {
        companyName: record.companyName,
        saasMspAgreement: record.saasMspAgreement,
        sponsor: record.sponsor,
        partnerProgram: record.partnerProgram,
        pointOfContact: record.pointOfContact,
        personEmailId: record.personEmailId,
        onBoardDate: record.onBoardDate,
        invoiceAmount: record.invoiceAmount,
        firstInvoiceDate: record.firstInvoiceDate,
        invoiceCycle: record.invoiceCycle,
        invoicesGenerated: record.invoicesGenerated,
        invoicesPaid: record.invoicesPaid,
        nextInvoiceStatus: record.nextInvoiceStatus,
        createdAt: record.createdAt,
      })
      created.push(record)
    })

    await withTimeout(batch.commit(), 'Importing records')
    return created
  }

  const items: OnboardingInvoiceRecord[] = inputs.map((input) => ({
    id: generateId(),
    ...input,
    createdAt,
  }))
  const existing = readLocal<OnboardingInvoiceRecord>(ONBOARDING_INVOICES_KEY)
  writeLocal(ONBOARDING_INVOICES_KEY, [...items, ...existing])
  return items
}

function crudCollection<T extends { id: string; createdAt: string }>(
  collectionName: string,
  localKey: string,
) {
  return {
    async fetch(): Promise<T[]> {
      const firestore = getDb()
      if (isFirebaseConfigured && firestore) {
        const snapshot = await withTimeout(
          getDocs(collection(firestore, collectionName)),
          `Loading ${collectionName}`,
        )
        return sortByCreatedAt(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as T[],
        )
      }
      return sortByCreatedAt(readLocal<T>(localKey))
    },

    async create(input: Omit<T, 'id' | 'createdAt'>): Promise<T> {
      const record = { ...input, createdAt: new Date().toISOString() } as Omit<T, 'id'>
      const firestore = getDb()
      if (isFirebaseConfigured && firestore) {
        const ref = await withTimeout(
          addDoc(collection(firestore, collectionName), record),
          `Creating ${collectionName}`,
        )
        return { id: ref.id, ...record } as T
      }
      const item = { id: generateId(), ...record } as T
      writeLocal(localKey, [item, ...readLocal<T>(localKey)])
      return item
    },

    async update(id: string, input: Omit<T, 'id' | 'createdAt'>): Promise<void> {
      const firestore = getDb()
      if (isFirebaseConfigured && firestore) {
        await withTimeout(
          updateDoc(doc(firestore, collectionName, id), input as Record<string, unknown>),
          `Updating ${collectionName}`,
        )
        return
      }
      writeLocal(
        localKey,
        readLocal<T>(localKey).map((item) =>
          item.id === id ? ({ ...item, ...input } as T) : item,
        ),
      )
    },

    async remove(id: string): Promise<void> {
      const firestore = getDb()
      if (isFirebaseConfigured && firestore) {
        await withTimeout(
          deleteDoc(doc(firestore, collectionName, id)),
          `Deleting ${collectionName}`,
        )
        return
      }
      writeLocal(
        localKey,
        readLocal<T>(localKey).filter((item) => item.id !== id),
      )
    },

    async createMany(inputs: Omit<T, 'id' | 'createdAt'>[]): Promise<T[]> {
      if (inputs.length === 0) return []

      const createdAt = new Date().toISOString()
      const firestore = getDb()

      if (isFirebaseConfigured && firestore) {
        const batch = writeBatch(firestore)
        const created: T[] = []

        inputs.forEach((input) => {
          const ref = doc(collection(firestore, collectionName))
          const record = { id: ref.id, ...input, createdAt } as T
          batch.set(ref, { ...input, createdAt })
          created.push(record)
        })

        await withTimeout(batch.commit(), `Importing ${collectionName}`)
        return created
      }

      const items = inputs.map(
        (input) => ({ id: generateId(), ...input, createdAt }) as T,
      )
      writeLocal(localKey, [...items, ...readLocal<T>(localKey)])
      return items
    },
  }
}

const paidInvoicesDb = crudCollection<PaidInvoice>('paid_invoices', PAID_INVOICES_KEY)
const openInvoicesDb = crudCollection<OpenInvoice>('open_invoices', OPEN_INVOICES_KEY)
const expensesDb = crudCollection<Expense>('expenses', EXPENSES_KEY)

export const fetchPaidInvoices = () => paidInvoicesDb.fetch()
export const createPaidInvoice = (input: CreatePaidInvoiceInput) =>
  paidInvoicesDb.create(input)
export const updatePaidInvoice = (id: string, input: CreatePaidInvoiceInput) =>
  paidInvoicesDb.update(id, input)
export const deletePaidInvoice = (id: string) => paidInvoicesDb.remove(id)
export const createPaidInvoicesBulk = (inputs: CreatePaidInvoiceInput[]) =>
  paidInvoicesDb.createMany(inputs)

export const fetchOpenInvoices = () => openInvoicesDb.fetch()
export const createOpenInvoice = (input: CreateOpenInvoiceInput) =>
  openInvoicesDb.create(input)
export const updateOpenInvoice = (id: string, input: CreateOpenInvoiceInput) =>
  openInvoicesDb.update(id, input)
export const deleteOpenInvoice = (id: string) => openInvoicesDb.remove(id)
export const createOpenInvoicesBulk = (inputs: CreateOpenInvoiceInput[]) =>
  openInvoicesDb.createMany(inputs)

export const fetchExpenses = () => expensesDb.fetch()
export const createExpense = (input: CreateExpenseInput) => expensesDb.create(input)
export const updateExpense = (id: string, input: CreateExpenseInput) =>
  expensesDb.update(id, input)
export const deleteExpense = (id: string) => expensesDb.remove(id)
export const createExpensesBulk = (inputs: CreateExpenseInput[]) =>
  expensesDb.createMany(inputs)
