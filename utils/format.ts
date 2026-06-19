import { format, parseISO } from 'date-fns'
import type { InvoiceStatus, OnboardingStatus } from '@/types'

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

export function onboardingStatusClass(status: OnboardingStatus) {
  return `border ${onboardingStatusStyles[status]}`
}

export function invoiceStatusClass(status: InvoiceStatus) {
  return `border ${invoiceStatusStyles[status]}`
}

export function onboardingStatusLabel(status: OnboardingStatus) {
  return status.replace('_', ' ')
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
