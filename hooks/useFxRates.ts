'use client'

import { useEffect, useState } from 'react'
import { fallbackFxPayload, type FxRatesPayload } from '@/lib/fx'

type FxState = FxRatesPayload & { warning?: string }

export function useFxRates() {
  const [rates, setRates] = useState<FxState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/fx/rates', { cache: 'no-store' })
        if (!res.ok) {
          // Route sometimes 404s during Next.js HMR — keep dashboard usable
          const fallback = fallbackFxPayload(
            `FX API returned ${res.status}; using fallback rates`,
          )
          if (!cancelled) {
            setRates(fallback)
            setError(fallback.warning ?? null)
          }
          return
        }

        const data = (await res.json()) as FxState
        if (!cancelled) {
          setRates({
            ...data,
            rates: data.rates ?? fallbackFxPayload().rates,
          })
          setError(data.warning ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = fallbackFxPayload(
            err instanceof Error
              ? `FX unavailable (${err.message}); using fallback rates`
              : 'FX unavailable; using fallback rates',
          )
          setRates(fallback)
          setError(fallback.warning ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { rates, loading, error }
}
