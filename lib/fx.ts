/** FX helpers — convert between currencies using today's USD-based rates. */

export type FxRatesFromUsd = Record<string, number> // 1 USD = N units of currency

export interface FxRatesPayload {
  date: string
  base: 'USD'
  /** Units of each currency per 1 USD (e.g. INR: 83.2, EUR: 0.92). */
  rates: FxRatesFromUsd
  source: string
}

const DISPLAY_TARGETS = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD'] as const

export function normalizeFxCode(currency: string | undefined | null): string {
  const raw = String(currency ?? '')
    .trim()
    .toUpperCase()
  if (!raw) return 'USD'
  if (raw === 'RS' || raw === 'RS.' || raw === 'RUPEE' || raw === 'RUPEES') return 'INR'
  if (raw === '$' || raw === 'US$') return 'USD'
  return raw.slice(0, 3)
}

/**
 * Convert `amount` from one currency to another.
 * `rates` are "units per 1 USD" (Frankfurter style).
 * Path: from → USD → to.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRatesFromUsd | null | undefined,
): number {
  if (!Number.isFinite(amount) || amount === 0) return 0
  const from = normalizeFxCode(fromCurrency)
  const to = normalizeFxCode(toCurrency)
  if (from === to) return amount

  const toUsd = (code: string, value: number): number | null => {
    if (code === 'USD') return value
    if (!rates) return null
    const perUsd = rates[code]
    if (!perUsd || perUsd <= 0) return null
    return value / perUsd
  }

  const fromUsd = (code: string, usd: number): number | null => {
    if (code === 'USD') return usd
    if (!rates) return null
    const perUsd = rates[code]
    if (!perUsd || perUsd <= 0) return null
    return usd * perUsd
  }

  const asUsd = toUsd(from, amount)
  if (asUsd === null) return amount
  const converted = fromUsd(to, asUsd)
  return converted === null ? asUsd : converted
}

/** Convert an amount in `currency` to USD. */
export function convertToUsd(
  amount: number,
  currency: string,
  rates: FxRatesFromUsd | null | undefined,
): number {
  return convertAmount(amount, currency, 'USD', rates)
}

/** How many USD equal 1 unit of currency (e.g. 1 INR ≈ 0.012 USD). */
export function usdPerUnit(currency: string, rates: FxRatesFromUsd | null | undefined): number {
  const code = normalizeFxCode(currency)
  if (code === 'USD') return 1
  if (!rates) return 0
  const perUsd = rates[code]
  if (!perUsd || perUsd <= 0) return 0
  return 1 / perUsd
}

export function formatFxBanner(
  rates: FxRatesFromUsd | null | undefined,
  displayCurrency = 'USD',
): string | null {
  if (!rates) return null
  const display = normalizeFxCode(displayCurrency)
  const parts: string[] = []

  if (rates.INR && rates.INR > 0) {
    parts.push(`1 USD = ₹${rates.INR.toFixed(2)}`)
    parts.push(`1 INR = $${(1 / rates.INR).toFixed(4)}`)
  }
  if (rates.EUR && rates.EUR > 0) {
    parts.push(`1 USD = €${rates.EUR.toFixed(4)}`)
  }
  if (display === 'INR' && rates.INR > 0 && rates.EUR > 0) {
    parts.push(`1 EUR ≈ ₹${(rates.INR / rates.EUR).toFixed(2)}`)
  }
  if (display === 'USD' && rates.EUR && rates.EUR > 0) {
    parts.push(`1 EUR = $${(1 / rates.EUR).toFixed(4)}`)
  }

  return parts.length ? parts.join(' · ') : null
}

/** @deprecated use formatFxBanner */
export function formatInrUsdRate(rates: FxRatesFromUsd | null | undefined): string | null {
  return formatFxBanner(rates, 'USD')
}

export const FX_DISPLAY_CURRENCIES = [...DISPLAY_TARGETS]

/** Approx USD→currency units when live FX is unavailable. */
export const FALLBACK_FX_RATES: FxRatesFromUsd = {
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.52,
  CAD: 1.36,
}

export function fallbackFxPayload(warning?: string): FxRatesPayload & { warning?: string } {
  return {
    date: new Date().toISOString().slice(0, 10),
    base: 'USD',
    rates: { ...FALLBACK_FX_RATES },
    source: 'fallback',
    ...(warning ? { warning } : {}),
  }
}
