'use client'

import { useEffect, useState } from 'react'
import { fallbackFxPayload, type FxRatesPayload } from '@/lib/fx'

type FxState = FxRatesPayload & { warning?: string }

/** Shared across mounts so Dashboard + UsdEquivalentHint don't duplicate slow FX fetches. */
let sharedRates: FxState | null = null
let sharedPromise: Promise<FxState> | null = null

async function loadFxRates(): Promise<FxState> {
  if (sharedRates) return sharedRates
  if (sharedPromise) return sharedPromise

  sharedPromise = (async () => {
    try {
      const res = await fetch('/api/fx/rates', {
        // Allow browser/CDN caching — server sets Cache-Control.
        cache: 'default',
      })
      if (!res.ok) {
        const fallback = fallbackFxPayload(
          `FX API returned ${res.status}; using fallback rates`,
        )
        sharedRates = fallback
        return fallback
      }

      const data = (await res.json()) as FxState
      const next: FxState = {
        ...data,
        rates: data.rates ?? fallbackFxPayload().rates,
      }
      sharedRates = next
      return next
    } catch (err) {
      const fallback = fallbackFxPayload(
        err instanceof Error
          ? `FX unavailable (${err.message}); using fallback rates`
          : 'FX unavailable; using fallback rates',
      )
      sharedRates = fallback
      return fallback
    } finally {
      sharedPromise = null
    }
  })()

  return sharedPromise
}

export function useFxRates() {
  const [rates, setRates] = useState<FxState | null>(() => sharedRates ?? fallbackFxPayload())
  const [loading, setLoading] = useState(!sharedRates)
  const [error, setError] = useState<string | null>(sharedRates?.warning ?? null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Keep UI responsive with fallback while live rates refresh.
      if (!sharedRates) {
        setRates(fallbackFxPayload())
        setLoading(true)
      }
      setError(null)

      const next = await loadFxRates()
      if (cancelled) return
      setRates(next)
      setError(next.warning ?? null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { rates, loading, error }
}
