import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  isValid,
  isBefore,
} from 'date-fns'
import { parseMoneyAmount, resolveCurrency } from '@/lib/currency'
import { convertAmount, type FxRatesFromUsd } from '@/lib/fx'
import type {
  Expense,
  Onboarding,
  OnboardingInvoiceRecord,
  OpenInvoice,
  PaidInvoice,
} from '@/types'

export type MonthKey = string // YYYY-MM

/** Display currency — all source currencies (USD/INR/EUR/…) convert into this. */
export type CurrencyMode = string

export interface AnalyticsMoneyOpts {
  /** Target display currency (USD, INR, EUR, …). All amounts convert into this. */
  currencyFilter?: CurrencyMode
  rates?: FxRatesFromUsd | null
}

export interface MonthBucket {
  key: MonthKey
  label: string
  count: number
  amount: number
}

export interface InvoiceMonthStats {
  key: MonthKey
  label: string
  raisedCount: number
  raisedAmount: number
  paidCount: number
  paidAmount: number
  pendingCount: number
  pendingAmount: number
}

export interface ForecastMonth {
  key: MonthKey
  label: string
  raisedCount: number
  raisedAmount: number
  paidCount: number
  paidAmount: number
  pendingCount: number
  pendingAmount: number
}

export interface StatusSlice {
  name: string
  value: number
  amount: number
}

export function toAmount(value: string | number | undefined | null): number {
  return parseMoneyAmount(value)
}

export function recordCurrency(
  currency: string | undefined | null,
  amount?: string | number | null,
): string {
  return resolveCurrency(currency, amount)
}

export function isConvertAllToUsd(currencyFilter: CurrencyMode | undefined): boolean {
  return displayCurrencyForFilter(currencyFilter) === 'USD'
}

/** Always convert every record into the selected display currency. */
export function isConvertMode(_currencyFilter?: CurrencyMode): boolean {
  return true
}

export function displayCurrencyForFilter(currencyFilter: CurrencyMode | undefined): string {
  const raw = (currencyFilter || 'USD').toUpperCase()
  if (raw === 'ALL_USD' || raw === 'CONVERT_USD') return 'USD'
  if (raw === 'ALL_INR' || raw === 'CONVERT_INR') return 'INR'
  if (raw.startsWith('ALL_') || raw.startsWith('CONVERT_')) {
    return raw.replace(/^(ALL_|CONVERT_)/, '') || 'USD'
  }
  return raw || 'USD'
}

function matchesCurrency(_recordCurrencyCode: string, _currencyFilter: CurrencyMode = ''): boolean {
  // Include every currency — amounts are converted to the display currency.
  return true
}

/** Convert native amount into the selected display currency (USD, INR, EUR, …). */
export function amountForAnalytics(
  value: string | number | undefined | null,
  currency: string | undefined | null,
  amountHint: string | number | undefined | null,
  opts: AnalyticsMoneyOpts = {},
): number {
  const from = recordCurrency(currency, amountHint ?? value)
  const native = toAmount(value)
  const to = displayCurrencyForFilter(opts.currencyFilter)
  return convertAmount(native, from, to, opts.rates)
}

export function collectCurrencies(args: {
  onboardings?: Onboarding[]
  onboardingInvoices?: OnboardingInvoiceRecord[]
  paid?: PaidInvoice[]
  open?: OpenInvoice[]
  expenses?: Expense[]
}): string[] {
  const set = new Set<string>()
  for (const row of args.onboardings ?? []) {
    set.add(recordCurrency(row.currency, row.committedAmount))
  }
  for (const row of args.onboardingInvoices ?? []) {
    set.add(recordCurrency(row.currency, row.invoiceAmount))
  }
  for (const row of args.paid ?? []) {
    set.add(recordCurrency(row.currency, row.invoiceAmount))
  }
  for (const row of args.open ?? []) {
    set.add(recordCurrency(row.currency, row.invoiceAmount))
  }
  for (const row of args.expenses ?? []) {
    set.add(recordCurrency(row.currency, row.amount))
  }
  const preferred = ['USD', 'INR']
  const rest = [...set].filter((c) => !preferred.includes(c)).sort()
  return [...preferred.filter((c) => set.has(c) || c === 'USD' || c === 'INR'), ...rest].filter(
    (c, i, arr) => arr.indexOf(c) === i,
  )
}

export function toMonthKey(dateStr: string | undefined | null): MonthKey | null {
  if (!dateStr?.trim()) return null
  const raw = dateStr.trim()
  const ymd = raw.match(/^(\d{4})-(\d{2})/)
  if (ymd) return `${ymd[1]}-${ymd[2]}`
  try {
    const d = parseISO(raw)
    if (!isValid(d)) return null
    return format(d, 'yyyy-MM')
  } catch {
    return null
  }
}

export function monthLabel(key: MonthKey): string {
  try {
    return format(parseISO(`${key}-01`), 'MMM yyyy')
  } catch {
    return key
  }
}

export function parseYearMonth(key: MonthKey): { year: string; month: string } | null {
  const m = key.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return { year: m[1], month: m[2] }
}

export function matchesYearMonth(
  dateStr: string | undefined,
  monthFilter: string,
  yearFilter: string,
): boolean {
  const key = toMonthKey(dateStr)
  if (!key) return !(monthFilter || yearFilter)
  const parts = parseYearMonth(key)
  if (!parts) return false
  if (monthFilter && parts.month !== monthFilter) return false
  if (yearFilter && parts.year !== yearFilter) return false
  return true
}

/** Cycle string → months between invoices (default monthly = 1). */
export function cycleToMonths(cycle: string | undefined): number {
  const c = (cycle ?? '').toLowerCase().trim()
  if (!c) return 1
  if (c.includes('week')) {
    if (c.includes('bi') || c.includes('2')) return 0.5
    return 0.25
  }
  if (c.includes('quarter') || c.includes('qtr') || /\b3\s*month/.test(c)) return 3
  if (c.includes('semi') || c.includes('6 month') || c.includes('biannual') || c.includes('bi-annual'))
    return 6
  if (c.includes('year') || c.includes('annual') || c.includes('12')) return 12
  if (c.includes('bi-month') || c.includes('bimonth') || c.includes('2 month')) return 2
  const num = c.match(/(\d+)\s*month/)
  if (num) return Math.max(1, Number(num[1]))
  return 1
}

export function clientStatusSlices(
  onboardings: Onboarding[],
  opts: AnalyticsMoneyOpts = {},
): StatusSlice[] {
  const map = new Map<string, { count: number; amount: number }>()
  for (const row of onboardings) {
    const code = recordCurrency(row.currency, row.committedAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const name = (row.status || 'Unknown').trim() || 'Unknown'
    const prev = map.get(name) ?? { count: 0, amount: 0 }
    prev.count += 1
    prev.amount += amountForAnalytics(row.committedAmount, row.currency, row.committedAmount, opts)
    map.set(name, prev)
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v.count, amount: v.amount }))
    .sort((a, b) => b.value - a.value)
}

export function clientsByMonth(
  onboardings: Onboarding[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
): MonthBucket[] {
  const map = new Map<MonthKey, MonthBucket>()
  for (const row of onboardings) {
    if (!matchesYearMonth(row.onboardingDate, monthFilter, yearFilter)) continue
    const code = recordCurrency(row.currency, row.committedAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const key = toMonthKey(row.onboardingDate)
    if (!key) continue
    const prev = map.get(key) ?? {
      key,
      label: monthLabel(key),
      count: 0,
      amount: 0,
    }
    prev.count += 1
    prev.amount += amountForAnalytics(row.committedAmount, row.currency, row.committedAmount, opts)
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function filterOnboardings(
  onboardings: Onboarding[],
  monthFilter: string,
  yearFilter: string,
  opts: AnalyticsMoneyOpts = {},
): Onboarding[] {
  return onboardings.filter((row) => {
    if (!matchesYearMonth(row.onboardingDate, monthFilter, yearFilter)) return false
    const code = recordCurrency(row.currency, row.committedAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) return false
    return true
  })
}

export function invoiceStatsByMonth(
  paid: PaidInvoice[],
  open: OpenInvoice[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
): InvoiceMonthStats[] {
  const map = new Map<MonthKey, InvoiceMonthStats>()

  const ensure = (key: MonthKey): InvoiceMonthStats => {
    let row = map.get(key)
    if (!row) {
      row = {
        key,
        label: monthLabel(key),
        raisedCount: 0,
        raisedAmount: 0,
        paidCount: 0,
        paidAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
      }
      map.set(key, row)
    }
    return row
  }

  for (const inv of paid) {
    if (!matchesYearMonth(inv.invoiceDate, monthFilter, yearFilter)) continue
    const code = recordCurrency(inv.currency, inv.invoiceAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const key = toMonthKey(inv.invoiceDate)
    if (!key) continue
    const row = ensure(key)
    const amt = amountForAnalytics(inv.invoiceAmount, inv.currency, inv.invoiceAmount, opts)
    row.paidCount += 1
    row.paidAmount += amt
    row.raisedCount += 1
    row.raisedAmount += amt
  }

  for (const inv of open) {
    if (!matchesYearMonth(inv.invoiceDate, monthFilter, yearFilter)) continue
    const code = recordCurrency(inv.currency, inv.invoiceAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const key = toMonthKey(inv.invoiceDate)
    if (!key) continue
    const row = ensure(key)
    const amt = amountForAnalytics(inv.invoiceAmount, inv.currency, inv.invoiceAmount, opts)
    row.pendingCount += 1
    row.pendingAmount += amt
    row.raisedCount += 1
    row.raisedAmount += amt
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function invoiceTotals(
  paid: PaidInvoice[],
  open: OpenInvoice[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
) {
  const paidFiltered = paid.filter((inv) => {
    if (!matchesYearMonth(inv.invoiceDate, monthFilter, yearFilter)) return false
    return matchesCurrency(recordCurrency(inv.currency, inv.invoiceAmount), opts.currencyFilter)
  })
  const openFiltered = open.filter((inv) => {
    if (!matchesYearMonth(inv.invoiceDate, monthFilter, yearFilter)) return false
    return matchesCurrency(recordCurrency(inv.currency, inv.invoiceAmount), opts.currencyFilter)
  })
  const paidAmount = paidFiltered.reduce(
    (s, i) => s + amountForAnalytics(i.invoiceAmount, i.currency, i.invoiceAmount, opts),
    0,
  )
  const pendingAmount = openFiltered.reduce(
    (s, i) => s + amountForAnalytics(i.invoiceAmount, i.currency, i.invoiceAmount, opts),
    0,
  )
  return {
    raisedCount: paidFiltered.length + openFiltered.length,
    raisedAmount: paidAmount + pendingAmount,
    paidCount: paidFiltered.length,
    paidAmount,
    pendingCount: openFiltered.length,
    pendingAmount,
  }
}

function parseDateSafe(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  try {
    const d = parseISO(value.trim())
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

/**
 * Forecast rolling window around current month:
 * previous `months` + current month + next `months`.
 * INR (and EUR / other) amounts convert into the selected display currency.
 */
export function forecastNextMonths(
  records: OnboardingInvoiceRecord[],
  months = 3,
  fromDate = new Date(),
  opts: AnalyticsMoneyOpts = {},
): ForecastMonth[] {
  const start = startOfMonth(fromDate)
  const windowStart = addMonths(start, -months)
  const keys: MonthKey[] = []
  for (let i = -months; i <= months; i++) {
    keys.push(format(addMonths(start, i), 'yyyy-MM'))
  }

  const buckets = new Map<MonthKey, ForecastMonth>()
  for (const key of keys) {
    buckets.set(key, {
      key,
      label: monthLabel(key),
      raisedCount: 0,
      raisedAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
    })
  }

  const horizonEnd = addMonths(start, months + 1)

  for (const rec of records) {
    const code = recordCurrency(rec.currency, rec.invoiceAmount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const amount = amountForAnalytics(rec.invoiceAmount, rec.currency, rec.invoiceAmount, opts)
    if (amount <= 0) continue

    const cycleMonths = cycleToMonths(rec.invoiceCycle)
    const first = parseDateSafe(rec.firstInvoiceDate) ?? parseDateSafe(rec.onBoardDate)
    if (!first) continue

    const generated = toAmount(rec.invoicesGenerated)
    const paidCountHist = toAmount(rec.invoicesPaid)
    let paidRatio =
      generated > 0 ? Math.min(1, Math.max(0, paidCountHist / generated)) : NaN
    if (!Number.isFinite(paidRatio)) {
      const totalPaid = amountForAnalytics(
        rec.totalAmountPaid,
        rec.currency,
        rec.totalAmountPaid,
        opts,
      )
      const pending = amountForAnalytics(rec.pendingAmount, rec.currency, rec.pendingAmount, opts)
      const denom = totalPaid + pending
      paidRatio = denom > 0 ? totalPaid / denom : 0.5
    }

    let cursor = first
    for (let step = 0; step < 120; step++) {
      if (!isBefore(cursor, horizonEnd)) break

      const key = format(cursor, 'yyyy-MM')
      if (isBefore(cursor, windowStart)) {
        if (cycleMonths < 1) {
          const days = cycleMonths <= 0.25 ? 7 : 14
          cursor = new Date(cursor.getTime() + days * 24 * 60 * 60 * 1000)
        } else {
          cursor = addMonths(cursor, cycleMonths)
        }
        continue
      }
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.raisedCount += 1
        bucket.raisedAmount += amount
        const paidPart = amount * paidRatio
        bucket.paidAmount += paidPart
        bucket.pendingAmount += amount - paidPart
      }

      if (cycleMonths < 1) {
        const days = cycleMonths <= 0.25 ? 7 : 14
        cursor = new Date(cursor.getTime() + days * 24 * 60 * 60 * 1000)
      } else {
        cursor = addMonths(cursor, cycleMonths)
      }
    }
  }

  for (const bucket of buckets.values()) {
    if (bucket.raisedAmount > 0 && bucket.raisedCount > 0) {
      const paidShare = bucket.paidAmount / bucket.raisedAmount
      bucket.paidCount = Math.round(bucket.raisedCount * paidShare)
      bucket.pendingCount = Math.max(0, bucket.raisedCount - bucket.paidCount)
    }
  }

  return keys.map((k) => buckets.get(k)!)
}

export function collectYearsFromDates(dates: (string | undefined)[]): string[] {
  const years = new Set<string>()
  for (const d of dates) {
    const key = toMonthKey(d)
    const parts = key ? parseYearMonth(key) : null
    if (parts) years.add(parts.year)
  }
  return [...years].sort((a, b) => b.localeCompare(a))
}

export interface ExpenseMonthStats {
  key: MonthKey
  label: string
  count: number
  amount: number
}

export function expenseTotals(
  expenses: Expense[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
) {
  const filtered = expenses.filter((row) => {
    if (!matchesYearMonth(row.invoiceDate, monthFilter, yearFilter)) return false
    return matchesCurrency(recordCurrency(row.currency, row.amount), opts.currencyFilter)
  })
  const amount = filtered.reduce(
    (s, row) => s + amountForAnalytics(row.amount, row.currency, row.amount, opts),
    0,
  )
  return { count: filtered.length, amount }
}

export function expensesByMonth(
  expenses: Expense[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
): ExpenseMonthStats[] {
  const map = new Map<MonthKey, ExpenseMonthStats>()
  for (const row of expenses) {
    if (!matchesYearMonth(row.invoiceDate, monthFilter, yearFilter)) continue
    const code = recordCurrency(row.currency, row.amount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const key = toMonthKey(row.invoiceDate)
    if (!key) continue
    const prev = map.get(key) ?? { key, label: monthLabel(key), count: 0, amount: 0 }
    prev.count += 1
    prev.amount += amountForAnalytics(row.amount, row.currency, row.amount, opts)
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function expensesByTool(
  expenses: Expense[],
  monthFilter = '',
  yearFilter = '',
  opts: AnalyticsMoneyOpts = {},
): StatusSlice[] {
  const map = new Map<string, { name: string; count: number; amount: number }>()
  const toToolKey = (value: string | undefined | null) =>
    (value || 'Unknown').trim().toLowerCase().replace(/\s+/g, ' ')
  const toDisplayName = (value: string | undefined | null) => {
    const cleaned = (value || 'Unknown').trim().replace(/\s+/g, ' ')
    if (!cleaned) return 'Unknown'
    return cleaned
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  for (const row of expenses) {
    if (!matchesYearMonth(row.invoiceDate, monthFilter, yearFilter)) continue
    const code = recordCurrency(row.currency, row.amount)
    if (!matchesCurrency(code, opts.currencyFilter)) continue
    const key = toToolKey(row.toolName)
    const prev = map.get(key) ?? { name: toDisplayName(row.toolName), count: 0, amount: 0 }
    prev.count += 1
    prev.amount += amountForAnalytics(row.amount, row.currency, row.amount, opts)
    map.set(key, prev)
  }
  return [...map.values()]
    .map((v) => ({ name: v.name, value: v.count, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount)
}

export const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]
