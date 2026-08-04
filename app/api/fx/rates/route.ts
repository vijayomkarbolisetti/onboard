import { NextResponse } from 'next/server'
import { FALLBACK_FX_RATES, type FxRatesPayload } from '@/lib/fx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TARGETS = ['INR', 'EUR', 'GBP', 'AUD', 'CAD'] as const
const PROVIDER_TIMEOUT_MS = 2500
const CACHE_TTL_MS = 60 * 60 * 1000

/** Prefer the current Frankfurter host; keep the old .app domain as a short-timeout backup. */
const PROVIDER_URLS = [
  `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${TARGETS.join(',')}`,
  `https://api.frankfurter.app/latest?from=USD&to=${TARGETS.join(',')}`,
]

type CachedRates = {
  expiresAt: number
  payload: FxRatesPayload
}

let memoryCache: CachedRates | null = null

function withTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function fetchFromProvider(
  url: string,
): Promise<{ date: string; rates: Record<string, number> }> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: withTimeout(PROVIDER_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`FX provider status ${res.status}`)
  }
  const data = (await res.json()) as {
    date?: string
    rates?: Record<string, number>
  }
  if (!data.rates || Object.keys(data.rates).length === 0) {
    throw new Error('FX provider returned empty rates')
  }
  return {
    date: data.date ?? new Date().toISOString().slice(0, 10),
    rates: data.rates,
  }
}

async function fetchLiveRates(): Promise<{ date: string; rates: Record<string, number> }> {
  const errors: string[] = []

  // Race providers — first success wins; each call is hard-capped by timeout.
  const result = await Promise.any(
    PROVIDER_URLS.map(async (url) => {
      try {
        return await fetchFromProvider(url)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'FX fetch failed'
        errors.push(message)
        throw error
      }
    }),
  ).catch(() => null)

  if (result) return result
  throw new Error(errors[0] ?? 'FX providers unavailable')
}

function fallbackPayload(warning: string): FxRatesPayload & { warning: string } {
  return {
    date: new Date().toISOString().slice(0, 10),
    base: 'USD',
    rates: { ...FALLBACK_FX_RATES },
    source: 'fallback',
    warning,
  }
}

/**
 * Today's FX rates with USD as base (1 USD = N units of currency).
 * Always returns 200 — uses fallback rates if live providers fail/timeout.
 * Cached in-memory for 1 hour to avoid repeated slow upstream calls on Vercel.
 */
export async function GET() {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return NextResponse.json(memoryCache.payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-FX-Cache': 'HIT',
      },
    })
  }

  try {
    const live = await fetchLiveRates()
    const rates = { ...FALLBACK_FX_RATES, ...live.rates }
    const payload: FxRatesPayload = {
      date: live.date,
      base: 'USD',
      rates,
      source: 'frankfurter',
    }
    memoryCache = { expiresAt: Date.now() + CACHE_TTL_MS, payload }
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-FX-Cache': 'MISS',
      },
    })
  } catch (error) {
    const payload = fallbackPayload(
      error instanceof Error
        ? `Live FX unavailable (${error.message}); using fallback rates`
        : 'Live FX unavailable; using fallback rates',
    )
    // Short-cache fallbacks so a flaky upstream doesn't keep blocking every request.
    memoryCache = { expiresAt: Date.now() + 5 * 60 * 1000, payload }
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'X-FX-Cache': 'FALLBACK',
      },
    })
  }
}
