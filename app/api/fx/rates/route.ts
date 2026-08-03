import { NextResponse } from 'next/server'
import { FALLBACK_FX_RATES, type FxRatesPayload } from '@/lib/fx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TARGETS = ['INR', 'EUR', 'GBP', 'AUD', 'CAD'] as const

const PROVIDER_URLS = [
  `https://api.frankfurter.app/latest?from=USD&to=${TARGETS.join(',')}`,
  `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${TARGETS.join(',')}`,
]

async function fetchLiveRates(): Promise<{ date: string; rates: Record<string, number> }> {
  let lastError: Error | null = null

  for (const url of PROVIDER_URLS) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        lastError = new Error(`FX provider status ${res.status}`)
        continue
      }
      const data = (await res.json()) as {
        date?: string
        rates?: Record<string, number>
      }
      if (!data.rates || Object.keys(data.rates).length === 0) {
        lastError = new Error('FX provider returned empty rates')
        continue
      }
      return {
        date: data.date ?? new Date().toISOString().slice(0, 10),
        rates: data.rates,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('FX fetch failed')
    }
  }

  throw lastError ?? new Error('FX providers unavailable')
}

/**
 * Today's FX rates with USD as base (1 USD = N units of currency).
 * Always returns 200 — uses fallback rates if live providers fail.
 */
export async function GET() {
  try {
    const live = await fetchLiveRates()
    const rates = { ...FALLBACK_FX_RATES, ...live.rates }
    const payload: FxRatesPayload = {
      date: live.date,
      base: 'USD',
      rates,
      source: 'frankfurter',
    }
    return NextResponse.json(payload)
  } catch (error) {
    const payload: FxRatesPayload & { warning: string } = {
      date: new Date().toISOString().slice(0, 10),
      base: 'USD',
      rates: { ...FALLBACK_FX_RATES },
      source: 'fallback',
      warning:
        error instanceof Error
          ? `Live FX unavailable (${error.message}); using fallback rates`
          : 'Live FX unavailable; using fallback rates',
    }
    return NextResponse.json(payload)
  }
}
