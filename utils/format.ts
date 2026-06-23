import { format, parseISO } from 'date-fns'
import type { InvoiceStatus, OnboardingStatus, OpenInvoice, PaidInvoice } from '@/types'

export function formatDate(value: string) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function toFormText(value: string | number | undefined | null) {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function displayFieldValue(value: string | number | undefined | null) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  } catch {
    return `${amount} ${currency || ''}`.trim()
  }
}

const onboardingStatusStyles: Record<OnboardingStatus, string> = {
  pending: 'bg-wyra-blue/15 text-wyra-blue border-wyra-blue/25',
  in_progress: 'bg-lime/15 text-lime border-lime/25',
  completed: 'bg-aqua/15 text-aqua border-aqua/25',
}

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  pending: 'bg-wyra-blue/15 text-wyra-blue border-wyra-blue/25',
  paid: 'bg-aqua/15 text-aqua border-aqua/25',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/25',
}

export function onboardingStatusClass(status: string) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_') as OnboardingStatus
  const style = onboardingStatusStyles[normalized]
  return `border ${style ?? 'bg-theme-hover text-theme-muted border-theme-strong'}`
}

export function invoiceStatusClass(status: InvoiceStatus) {
  return `border ${invoiceStatusStyles[status]}`
}

export function onboardingStatusLabel(status: string) {
  return status.trim() || '—'
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function resolveInvoiceNumber(record: Record<string, unknown>) {
  const candidates = [
    record.invoiceNumber,
    record.invoiceNo,
    record['Invoice Number'],
    record['Invoive Number'],
    record.invoiveNumber,
    record.invoice_number,
    record.invoice_no,
  ]

  for (const value of candidates) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }

  return ''
}

export function normalizePaidInvoice(record: PaidInvoice): PaidInvoice {
  const invoiceNumber = resolveInvoiceNumber(record as unknown as Record<string, unknown>)
  return invoiceNumber ? { ...record, invoiceNumber } : record
}

export function normalizeOpenInvoice(record: OpenInvoice): OpenInvoice {
  const invoiceNumber = resolveInvoiceNumber(record as unknown as Record<string, unknown>)
  return invoiceNumber ? { ...record, invoiceNumber } : record
}

/** Form state for controlled number inputs — empty string while the user clears the field. */
export type NumberFieldValue = number | ''

export function numberFieldDisplay(value: NumberFieldValue): number | '' {
  return value === '' ? '' : value
}

export function parseIntegerField(raw: string): NumberFieldValue {
  if (raw === '') return ''
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) return ''
  return Math.max(0, Math.trunc(parsed))
}

export function parseDecimalField(raw: string): NumberFieldValue {
  if (raw === '') return ''
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) return ''
  return Math.max(0, parsed)
}

export function toNumber(value: NumberFieldValue, fallback = 0): number {
  return value === '' ? fallback : value
}

export function parseCompanyNames(value: string | null | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function formatCompanyNames(names: string[] | string | null | undefined): string {
  if (Array.isArray(names)) {
    return names
      .map((name) => name.trim())
      .filter(Boolean)
      .join(', ')
  }
  return parseCompanyNames(names).join(', ')
}
