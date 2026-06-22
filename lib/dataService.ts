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

async function readOrgApiRecords<T>(path: string, label: string): Promise<T[]> {
  const response = await fetch(path)
  const payload = (await response.json()) as { records?: T[]; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to load ${label}`)
  }

  return payload.records ?? []
}

async function writeOrgApiRecord<T>(
  path: string,
  body: unknown,
  label: string,
  recordKey: 'record' | 'records' = 'record',
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as Record<string, T | undefined> & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to save ${label}`)
  }

  const record = payload[recordKey]
  if (!record) {
    throw new Error(`Failed to save ${label}`)
  }

  return record
}

async function patchOrgApiRecord(path: string, body: unknown, label: string): Promise<void> {
  const response = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to update ${label}`)
  }
}

async function deleteOrgApiRecord(path: string, label: string): Promise<void> {
  const response = await fetch(path, { method: 'DELETE' })
  const payload = (await response.json()) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to delete ${label}`)
  }
}

export async function fetchOnboardings(): Promise<Onboarding[]> {
  return readOrgApiRecords<Onboarding>('/api/data/onboardings', 'onboardings')
}

export async function createOnboarding(
  input: CreateOnboardingInput,
): Promise<Onboarding> {
  return writeOrgApiRecord<Onboarding>('/api/data/onboardings', input, 'onboarding')
}

export async function updateOnboarding(
  id: string,
  input: CreateOnboardingInput,
): Promise<void> {
  await patchOrgApiRecord(`/api/data/onboardings/${id}`, input, 'onboarding')
}

export async function updateOnboardingStatus(
  id: string,
  status: Onboarding['status'],
): Promise<void> {
  await patchOrgApiRecord(`/api/data/onboardings/${id}`, { status }, 'onboarding')
}

export async function deleteOnboarding(id: string): Promise<void> {
  await deleteOrgApiRecord(`/api/data/onboardings/${id}`, 'onboarding')
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
  return readOrgApiRecords<OnboardingInvoiceRecord>(
    '/api/data/onboarding-invoices',
    'onboarding invoices',
  )
}

export async function createOnboardingInvoice(
  input: CreateOnboardingInvoiceInput,
): Promise<OnboardingInvoiceRecord> {
  return writeOrgApiRecord<OnboardingInvoiceRecord>(
    '/api/data/onboarding-invoices',
    input,
    'onboarding invoice',
  )
}

export async function updateOnboardingInvoice(
  id: string,
  input: CreateOnboardingInvoiceInput,
): Promise<void> {
  await patchOrgApiRecord(`/api/data/onboarding-invoices/${id}`, input, 'onboarding invoice')
}

export async function deleteOnboardingInvoice(id: string): Promise<void> {
  await deleteOrgApiRecord(`/api/data/onboarding-invoices/${id}`, 'onboarding invoice')
}

export async function createOnboardingInvoicesBulk(
  inputs: CreateOnboardingInvoiceInput[],
): Promise<OnboardingInvoiceRecord[]> {
  if (inputs.length === 0) {
    return []
  }

  const response = await fetch('/api/data/onboarding-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: inputs }),
  })
  const payload = (await response.json()) as {
    records?: OnboardingInvoiceRecord[]
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to import onboarding invoices')
  }

  return payload.records ?? []
}

export const fetchPaidInvoices = () => readOrgApiRecords<PaidInvoice>('/api/data/paid-invoices', 'paid invoices')
export const createPaidInvoice = (input: CreatePaidInvoiceInput) =>
  writeOrgApiRecord<PaidInvoice>('/api/data/paid-invoices', input, 'paid invoice')
export const updatePaidInvoice = (id: string, input: CreatePaidInvoiceInput) =>
  patchOrgApiRecord(`/api/data/paid-invoices/${id}`, input, 'paid invoice')
export const deletePaidInvoice = (id: string) =>
  deleteOrgApiRecord(`/api/data/paid-invoices/${id}`, 'paid invoice')
export const createPaidInvoicesBulk = async (inputs: CreatePaidInvoiceInput[]) => {
  if (inputs.length === 0) {
    return []
  }

  const response = await fetch('/api/data/paid-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: inputs }),
  })
  const payload = (await response.json()) as { records?: PaidInvoice[]; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to import paid invoices')
  }

  return payload.records ?? []
}

export const fetchOpenInvoices = () => readOrgApiRecords<OpenInvoice>('/api/data/open-invoices', 'open invoices')
export const createOpenInvoice = (input: CreateOpenInvoiceInput) =>
  writeOrgApiRecord<OpenInvoice>('/api/data/open-invoices', input, 'open invoice')
export const updateOpenInvoice = (id: string, input: CreateOpenInvoiceInput) =>
  patchOrgApiRecord(`/api/data/open-invoices/${id}`, input, 'open invoice')
export const deleteOpenInvoice = (id: string) =>
  deleteOrgApiRecord(`/api/data/open-invoices/${id}`, 'open invoice')
export const createOpenInvoicesBulk = async (inputs: CreateOpenInvoiceInput[]) => {
  if (inputs.length === 0) {
    return []
  }

  const response = await fetch('/api/data/open-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: inputs }),
  })
  const payload = (await response.json()) as { records?: OpenInvoice[]; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to import open invoices')
  }

  return payload.records ?? []
}

export const fetchExpenses = () => readOrgApiRecords<Expense>('/api/data/expenses', 'expenses')
export const createExpense = (input: CreateExpenseInput) =>
  writeOrgApiRecord<Expense>('/api/data/expenses', input, 'expense')
export const updateExpense = (id: string, input: CreateExpenseInput) =>
  patchOrgApiRecord(`/api/data/expenses/${id}`, input, 'expense')
export const deleteExpense = (id: string) =>
  deleteOrgApiRecord(`/api/data/expenses/${id}`, 'expense')
export const createExpensesBulk = async (inputs: CreateExpenseInput[]) => {
  if (inputs.length === 0) {
    return []
  }

  const response = await fetch('/api/data/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: inputs }),
  })
  const payload = (await response.json()) as { records?: Expense[]; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to import expenses')
  }

  return payload.records ?? []
}
