import type { TabId } from '@/types'

/** Modules that can be permission-gated (same as app tabs). */
export type ModuleId = TabId

export type ModulePermission = {
  /** Can open the module / see data */
  view: boolean
  /** Create, edit, delete, import, upload documents */
  write: boolean
}

export type ModuleAccessMap = Partial<Record<ModuleId, ModulePermission>>

export const MODULE_DEFS: { id: ModuleId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'onboarding', label: 'Client Tracker' },
  { id: 'onboarding-invoices', label: 'Onboarding & Invoices' },
  { id: 'paid-invoices', label: 'Paid Invoices' },
  { id: 'open-invoices', label: 'Open Invoices' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'team', label: 'Team & Invites' },
]

export const MODULE_IDS = MODULE_DEFS.map((m) => m.id)

const FULL: ModulePermission = { view: true, write: true }
const VIEW_ONLY: ModulePermission = { view: true, write: false }
const NONE: ModulePermission = { view: false, write: false }

/** Default when admin — full access everywhere. */
export function adminModuleAccess(): Record<ModuleId, ModulePermission> {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, { ...FULL }])) as Record<
    ModuleId,
    ModulePermission
  >
}

/**
 * Default for members with no custom metadata:
 * can view all data modules (read-only), no team management.
 */
export function defaultMemberModuleAccess(): Record<ModuleId, ModulePermission> {
  return {
    dashboard: { ...VIEW_ONLY },
    onboarding: { ...VIEW_ONLY },
    'onboarding-invoices': { ...VIEW_ONLY },
    'paid-invoices': { ...VIEW_ONLY },
    'open-invoices': { ...VIEW_ONLY },
    expenses: { ...VIEW_ONLY },
    team: { view: true, write: false },
  }
}

export function emptyModuleAccess(): Record<ModuleId, ModulePermission> {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, { ...NONE }])) as Record<
    ModuleId,
    ModulePermission
  >
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Normalize stored / partial map into a full map. */
export function normalizeModuleAccess(
  raw: unknown,
  isAdmin: boolean,
): Record<ModuleId, ModulePermission> {
  if (isAdmin) return adminModuleAccess()

  const base = defaultMemberModuleAccess()
  if (!raw || typeof raw !== 'object') return base

  const input = raw as ModuleAccessMap
  const next = { ...base }

  for (const id of MODULE_IDS) {
    const entry = input[id]
    if (!entry || typeof entry !== 'object') continue
    const view = asBool(entry.view, base[id].view)
    // write implies view
    const write = asBool(entry.write, base[id].write)
    next[id] = {
      view: view || write,
      write,
    }
  }

  // Team write is always admin-only (invite / role / remove).
  next.team = { view: next.team.view, write: false }

  return next
}

export function canViewModule(
  access: Record<ModuleId, ModulePermission>,
  moduleId: ModuleId,
): boolean {
  return Boolean(access[moduleId]?.view)
}

export function canWriteModule(
  access: Record<ModuleId, ModulePermission>,
  moduleId: ModuleId,
): boolean {
  return Boolean(access[moduleId]?.write)
}

export function firstViewableModule(
  access: Record<ModuleId, ModulePermission>,
  preferred: ModuleId = 'dashboard',
): ModuleId {
  if (canViewModule(access, preferred)) return preferred
  for (const id of MODULE_IDS) {
    if (canViewModule(access, id)) return id
  }
  return 'dashboard'
}

/** Map S3 / document folder → module id for upload permission checks. */
export function moduleIdFromDocumentFolder(folder: string): ModuleId | null {
  const f = folder.trim().toLowerCase()
  if (f === 'paid-invoices' || f === 'paid_invoices') return 'paid-invoices'
  if (f === 'open-invoices' || f === 'open_invoices') return 'open-invoices'
  if (f === 'expenses') return 'expenses'
  return null
}

export function moduleIdFromApiPath(pathname: string): ModuleId | null {
  if (pathname.includes('/onboardings')) return 'onboarding'
  if (pathname.includes('/onboarding-invoices')) return 'onboarding-invoices'
  if (pathname.includes('/paid-invoices')) return 'paid-invoices'
  if (pathname.includes('/open-invoices')) return 'open-invoices'
  if (pathname.includes('/expenses')) return 'expenses'
  if (pathname.includes('/team')) return 'team'
  return null
}

/** Sanitize a permissions payload from the admin UI / invite form. */
export function sanitizeModuleAccessInput(raw: unknown): ModuleAccessMap {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as ModuleAccessMap
  const next: ModuleAccessMap = {}
  for (const id of MODULE_IDS) {
    const entry = input[id]
    if (!entry || typeof entry !== 'object') continue
    const view = Boolean(entry.view)
    const write = Boolean(entry.write)
    next[id] = {
      view: view || write,
      write: id === 'team' ? false : write,
    }
  }
  return next
}

/** Full map ready to persist (no undefined fields). */
export function toStoredModuleAccess(raw: unknown): Record<ModuleId, ModulePermission> {
  return normalizeModuleAccess(sanitizeModuleAccessInput(raw), false)
}
