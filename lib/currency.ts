/** Shared currency helpers for invoices, expenses, and dashboard. */

export const CURRENCY_OPTIONS = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD'] as const

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number] | string

export function normalizeCurrencyCode(value: string | undefined | null): string {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
  if (!raw) return 'USD'
  if (raw === 'RS' || raw === 'RS.' || raw === 'RUPEE' || raw === 'RUPEES') return 'INR'
  if (raw === '$' || raw === 'US$' || raw === 'DOLLAR' || raw === 'DOLLARS') return 'USD'
  if (/^[A-Z]{3}$/.test(raw)) return raw
  return raw.slice(0, 3)
}

/**
 * Infer currency from an explicit field and/or amount text (₹ / INR / $ / USD).
 * Defaults to USD when nothing indicates otherwise (legacy records).
 */
export function resolveCurrency(
  currency: string | undefined | null,
  amountText?: string | number | null,
): string {
  if (currency != null && String(currency).trim()) {
    return normalizeCurrencyCode(currency)
  }

  const text = String(amountText ?? '')
  if (/₹|inr|\brs\.?\b|rupee/i.test(text)) return 'INR'
  if (/\$|usd|\bus\$\b/i.test(text)) return 'USD'
  return 'USD'
}

/** Parse numeric amount from values that may include ₹, $, INR, commas, etc. */
export function parseMoneyAmount(value: string | number | undefined | null): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  let text = String(value).trim()
  if (!text) return 0

  text = text
    .replace(/₹/g, '')
    .replace(/\$/g, '')
    .replace(/\b(INR|USD|EUR|GBP|AUD|CAD|Rs\.?|rupees?)\b/gi, '')
    .replace(/,/g, '')
    .trim()

  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const code = normalizeCurrencyCode(currency)
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}

export function shortMoneyAxis(value: number, currency = 'USD'): string {
  const code = normalizeCurrencyCode(currency)
  const symbol = code === 'INR' ? '₹' : code === 'USD' ? '$' : `${code} `
  if (Math.abs(value) >= 100000) {
    return `${symbol}${(value / 100000).toFixed(1)}L`
  }
  if (Math.abs(value) >= 1000) {
    return `${symbol}${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  }
  return `${symbol}${value}`
}
