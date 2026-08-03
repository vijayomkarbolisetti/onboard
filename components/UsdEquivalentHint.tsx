'use client'

import { formatMoney, parseMoneyAmount } from '@/lib/currency'
import { convertToUsd } from '@/lib/fx'
import { useFxRates } from '@/hooks/useFxRates'

/** Live USD equivalent when the user enters a non-USD amount (e.g. INR). */
export function UsdEquivalentHint({
  amount,
  currency,
}: {
  amount: string
  currency: string
}) {
  const { rates } = useFxRates()
  const code = (currency || 'USD').toUpperCase()
  if (code === 'USD') return null

  const native = parseMoneyAmount(amount)
  if (native <= 0 || !rates?.rates) return null

  const usd = convertToUsd(native, code, rates.rates)
  return (
    <p className="mt-1 text-xs text-theme-muted">
      ≈ {formatMoney(usd, 'USD')} today
      {rates.date ? ` (${rates.date})` : ''}
    </p>
  )
}
