'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, Info, LayoutDashboard } from 'lucide-react'
import { WyraSelect } from '@/components/CompanyNameSelect'
import { useTheme } from '@/components/ThemeProvider'
import {
  collectCurrencies,
  collectYearsFromDates,
  clientsByMonth,
  clientStatusSlices,
  displayCurrencyForFilter,
  expenseTotals,
  expensesByMonth,
  expensesByTool,
  filterOnboardings,
  forecastNextMonths,
  invoiceStatsByMonth,
  invoiceTotals,
  MONTH_OPTIONS,
  amountForAnalytics,
  type AnalyticsMoneyOpts,
} from '@/lib/dashboardAnalytics'
import { formatMoney, shortMoneyAxis } from '@/lib/currency'
import { formatFxBanner, FX_DISPLAY_CURRENCIES } from '@/lib/fx'
import { buildAndDownloadDashboardReport } from '@/lib/dashboardExcel'
import { useFxRates } from '@/hooks/useFxRates'
import { cn } from '@/lib/utils'
import type {
  Expense,
  Onboarding,
  OnboardingInvoiceRecord,
  OpenInvoice,
  PaidInvoice,
} from '@/types'

const PIE_COLORS = ['#1fcc9a', '#00a0f0', '#a5c626', '#7c73b5', '#241f5b', '#f59e0b', '#ef4444']

interface DashboardProps {
  onboardings: Onboarding[]
  onboardingInvoices: OnboardingInvoiceRecord[]
  paidInvoices: PaidInvoice[]
  openInvoices: OpenInvoice[]
  expenses: Expense[]
  loading?: boolean
  error?: string | null
}

function StatCard({
  label,
  count,
  amount,
  accent,
  currency,
  amountLabel = 'Amount',
}: {
  label: string
  count: number
  amount: number
  accent: string
  currency: string
  amountLabel?: string
}) {
  return (
    <div className="glass-card rounded-2xl border border-theme p-5">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
            {label}
          </p>
          <p className={cn('mt-2 text-3xl font-bold tracking-tight', accent)}>{count}</p>
        </div>
        <div className="sm:border-l sm:border-theme sm:pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
            {amountLabel}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-theme-fg">
            {formatMoney(amount, currency)}
          </p>
        </div>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="glass-card rounded-2xl border border-theme p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-theme-fg">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-theme-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function MonthYearFilters({
  month,
  year,
  years,
  onMonth,
  onYear,
}: {
  month: string
  year: string
  years: string[]
  onMonth: (v: string) => void
  onYear: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label className="mb-1 block text-xs font-medium text-theme-muted">Month</label>
        <WyraSelect
          value={month}
          onChange={onMonth}
          placeholder="All months"
          options={MONTH_OPTIONS}
        />
      </div>
      <div className="min-w-[110px]">
        <label className="mb-1 block text-xs font-medium text-theme-muted">Year</label>
        <WyraSelect
          value={year}
          onChange={onYear}
          placeholder="All years"
          options={years.map((y) => ({ value: y, label: y }))}
        />
      </div>
    </div>
  )
}

function FxRateInfo({
  rateLabel,
  date,
  source,
  loading,
  warning,
  displayCurrency,
}: {
  rateLabel: string | null
  date?: string
  source?: string
  loading: boolean
  warning: string | null
  displayCurrency: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const rateLines = (rateLabel ?? '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Currency conversion info"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-theme text-theme-muted transition',
          'hover:border-aqua/40 hover:bg-aqua/10 hover:text-aqua',
          open && 'border-aqua/40 bg-aqua/10 text-aqua',
        )}
      >
        <Info size={16} />
      </button>

      {open ? (
        <div
          role="tooltip"
          className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-theme bg-theme-surface p-4 shadow-lg sm:left-auto sm:right-0"
        >
          <p className="text-sm font-semibold text-theme-fg">Currency conversion</p>
          <p className="mt-1 text-xs leading-relaxed text-theme-muted">
            All amounts (USD, INR, EUR, …) convert to{' '}
            <span className="font-semibold text-theme-fg">{displayCurrency}</span> using
            today&apos;s FX rates.
          </p>

          <div className="mt-3 rounded-xl border border-theme bg-theme-elevated/50 px-3 py-2.5">
            {loading && !rateLabel ? (
              <p className="text-xs text-theme-muted">Loading FX rates…</p>
            ) : rateLines.length > 0 ? (
              <ul className="space-y-1.5">
                {rateLines.map((line) => (
                  <li key={line} className="text-xs font-medium text-theme-body">
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-theme-muted">FX rates unavailable.</p>
            )}
            {(date || source) && (
              <p className="mt-2 text-[11px] text-theme-muted">
                {date ?? '—'}
                {source ? ` · ${source}` : ''}
              </p>
            )}
            {warning ? <p className="mt-2 text-[11px] text-amber-500">{warning}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Dashboard({
  onboardings,
  onboardingInvoices,
  paidInvoices,
  openInvoices,
  expenses,
  loading,
  error,
}: DashboardProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { rates: fxPayload, loading: fxLoading, error: fxError } = useFxRates()

  const [clientMonth, setClientMonth] = useState('')
  const [clientYear, setClientYear] = useState('')
  const [invoiceMonth, setInvoiceMonth] = useState('')
  const [invoiceYear, setInvoiceYear] = useState('')
  const [expenseMonth, setExpenseMonth] = useState('')
  const [expenseYear, setExpenseYear] = useState('')
  /** Display currency — USD/INR/EUR/… ; all uploaded currencies convert into this. */
  const [currencyFilter, setCurrencyFilter] = useState('USD')

  const chartFg = isLight ? '#241f5b' : '#cbd5e1'
  const chartMuted = isLight ? '#5c5a78' : '#94a3b8'
  const gridStroke = isLight ? '#e0dde8' : 'rgba(148, 163, 184, 0.2)'
  const tooltipStyle = {
    backgroundColor: isLight ? '#ffffff' : '#141b2d',
    border: `1px solid ${isLight ? '#e8e6f0' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 12,
    color: chartFg,
  }

  const availableCurrencies = useMemo(
    () =>
      collectCurrencies({
        onboardings,
        onboardingInvoices,
        paid: paidInvoices,
        open: openInvoices,
        expenses,
      }),
    [onboardings, onboardingInvoices, paidInvoices, openInvoices, expenses],
  )

  const moneyOpts: AnalyticsMoneyOpts = useMemo(
    () => ({
      currencyFilter,
      rates: fxPayload?.rates ?? null,
    }),
    [currencyFilter, fxPayload?.rates],
  )

  const displayCurrency = displayCurrencyForFilter(currencyFilter)
  const rateLabel = formatFxBanner(fxPayload?.rates, displayCurrency)

  const currencyOptions = useMemo(() => {
    const fromData = availableCurrencies
    const targets = [...new Set([...FX_DISPLAY_CURRENCIES, ...fromData])]
    return targets.map((code) => ({
      value: code,
      label: `Show in ${code} (convert all)`,
    }))
  }, [availableCurrencies])

  const clientYears = useMemo(
    () => collectYearsFromDates(onboardings.map((o) => o.onboardingDate)),
    [onboardings],
  )

  const invoiceYears = useMemo(
    () =>
      collectYearsFromDates([
        ...paidInvoices.map((i) => i.invoiceDate),
        ...openInvoices.map((i) => i.invoiceDate),
      ]),
    [paidInvoices, openInvoices],
  )

  const expenseYears = useMemo(
    () => collectYearsFromDates(expenses.map((e) => e.invoiceDate)),
    [expenses],
  )

  const filteredClients = useMemo(
    () => filterOnboardings(onboardings, clientMonth, clientYear, moneyOpts),
    [onboardings, clientMonth, clientYear, moneyOpts],
  )

  const statusSlices = useMemo(
    () => clientStatusSlices(filteredClients, moneyOpts),
    [filteredClients, moneyOpts],
  )

  const clientMonths = useMemo(
    () => clientsByMonth(onboardings, clientMonth, clientYear, moneyOpts),
    [onboardings, clientMonth, clientYear, moneyOpts],
  )

  const invoiceSummary = useMemo(
    () => invoiceTotals(paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts),
    [paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts],
  )

  const invoiceMonths = useMemo(
    () => invoiceStatsByMonth(paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts),
    [paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts],
  )

  const forecast = useMemo(
    () => forecastNextMonths(onboardingInvoices, 6, new Date(), moneyOpts),
    [onboardingInvoices, moneyOpts],
  )

  const expenseSummary = useMemo(
    () => expenseTotals(expenses, expenseMonth, expenseYear, moneyOpts),
    [expenses, expenseMonth, expenseYear, moneyOpts],
  )

  const expenseMonths = useMemo(
    () => expensesByMonth(expenses, expenseMonth, expenseYear, moneyOpts),
    [expenses, expenseMonth, expenseYear, moneyOpts],
  )

  const expenseTools = useMemo(
    () => expensesByTool(expenses, expenseMonth, expenseYear, moneyOpts),
    [expenses, expenseMonth, expenseYear, moneyOpts],
  )

  const forecastTotals = useMemo(
    () =>
      forecast.reduce(
        (acc, m) => {
          acc.raisedCount += m.raisedCount
          acc.raisedAmount += m.raisedAmount
          acc.paidCount += m.paidCount
          acc.paidAmount += m.paidAmount
          acc.pendingCount += m.pendingCount
          acc.pendingAmount += m.pendingAmount
          return acc
        },
        {
          raisedCount: 0,
          raisedAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
        },
      ),
    [forecast],
  )

  const committedTotal = useMemo(
    () =>
      filteredClients.reduce(
        (s, c) =>
          s + amountForAnalytics(c.committedAmount, c.currency, c.committedAmount, moneyOpts),
        0,
      ),
    [filteredClients, moneyOpts],
  )

  const handleDownload = () => {
    buildAndDownloadDashboardReport({
      onboardings,
      onboardingInvoices,
      paid: paidInvoices,
      open: openInvoices,
      expenses,
      clientMonthFilter: clientMonth,
      clientYearFilter: clientYear,
      invoiceMonthFilter: invoiceMonth,
      invoiceYearFilter: invoiceYear,
      expenseMonthFilter: expenseMonth,
      expenseYearFilter: expenseYear,
      currencyFilter,
      rates: fxPayload?.rates ?? null,
    })
  }

  if (loading || (fxLoading && !fxPayload)) {
    return (
      <div className="flex items-center justify-center py-24 text-theme-muted">
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-theme-muted">
            <LayoutDashboard className="h-4 w-4 text-aqua" />
            <span className="text-sm">Show amounts in</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="min-w-[220px]">
              <WyraSelect
                value={currencyFilter}
                onChange={setCurrencyFilter}
                allowEmpty={false}
                placeholder="Currency"
                options={currencyOptions}
              />
            </div>
            <FxRateInfo
              rateLabel={rateLabel}
              date={fxPayload?.date}
              source={fxPayload?.source}
              loading={fxLoading}
              warning={fxError}
              displayCurrency={displayCurrency}
            />
          </div>
        </div>
        <button type="button" onClick={handleDownload} className="btn-wyra inline-flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download detailed report
        </button>
      </div>

      {/* Clients */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-theme-fg">Clients</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Overall and month-wise onboarding — use filters for a custom month
            </p>
          </div>
          <MonthYearFilters
            month={clientMonth}
            year={clientYear}
            years={clientYears}
            onMonth={setClientMonth}
            onYear={setClientYear}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Overall clients"
            subtitle="Distribution by status · hover for count and committed amount"
            actions={
              <div className="rounded-xl border border-theme bg-theme-elevated/50 px-3 py-2 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
                  Total clients
                </p>
                <p className="text-lg font-bold text-aqua">{filteredClients.length}</p>
                <p className="text-[11px] font-medium text-theme-muted">Committed amount</p>
                <p className="text-sm font-semibold text-theme-fg">
                  {formatMoney(committedTotal, displayCurrency)}
                </p>
              </div>
            }
          >
            <div className="h-72">
              {statusSlices.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {statusSlices.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, item) => {
                        const amount = (item?.payload as { amount?: number })?.amount ?? 0
                        return [
                          `${value} clients · ${formatMoney(amount, displayCurrency)}`,
                          String(name),
                        ]
                      }}
                    />
                    <Legend wrapperStyle={{ color: chartMuted }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Month-wise clients"
            subtitle="New clients by onboarding month (bar = count)"
          >
            <div className="h-72">
              {clientMonths.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientMonths} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: chartMuted, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, item) => {
                        if (name === 'count') {
                          const amount = (item?.payload as { amount?: number })?.amount ?? 0
                          return [
                            `${value} · ${formatMoney(amount, displayCurrency)}`,
                            'Clients',
                          ]
                        }
                        return [value, String(name)]
                      }}
                    />
                    <Bar dataKey="count" name="count" fill="#1fcc9a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>
      </section>

      {/* Invoices */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-theme-fg">Invoices</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Raised = paid + pending · separate month/year filter
            </p>
          </div>
          <MonthYearFilters
            month={invoiceMonth}
            year={invoiceYear}
            years={invoiceYears}
            onMonth={setInvoiceMonth}
            onYear={setInvoiceYear}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total invoices raised"
            count={invoiceSummary.raisedCount}
            amount={invoiceSummary.raisedAmount}
            accent="text-wyra-blue"
            currency={displayCurrency}
          />
          <StatCard
            label="Paid invoices"
            count={invoiceSummary.paidCount}
            amount={invoiceSummary.paidAmount}
            accent="text-aqua"
            currency={displayCurrency}
          />
          <StatCard
            label="Pending invoices"
            count={invoiceSummary.pendingCount}
            amount={invoiceSummary.pendingAmount}
            accent="text-amber-400"
            currency={displayCurrency}
          />
        </div>

        <ChartCard
          title="Invoices by month"
          subtitle={`Amounts (${displayCurrency}) for raised, paid, and pending`}
        >
          <div className="h-80">
            {invoiceMonths.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceMonths} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: chartMuted, fontSize: 11 }}
                    tickFormatter={(v) => shortMoneyAxis(Number(v) || 0, displayCurrency)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      formatMoney(Number(value) || 0, displayCurrency),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ color: chartMuted }} />
                  <Bar dataKey="raisedAmount" name="Raised" fill="#00a0f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paidAmount" name="Paid" fill="#1fcc9a" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="pendingAmount"
                    name="Pending"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* Expenses */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-theme-fg">Expenses</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Tool spend from Expenses tab · any currency converts to {displayCurrency}
            </p>
          </div>
          <MonthYearFilters
            month={expenseMonth}
            year={expenseYear}
            years={expenseYears}
            onMonth={setExpenseMonth}
            onYear={setExpenseYear}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total expenses"
            count={expenseSummary.count}
            amount={expenseSummary.amount}
            accent="text-aqua"
            currency={displayCurrency}
          />
          <StatCard
            label="Tools with spend"
            count={expenseTools.length}
            amount={expenseTools.reduce((s, t) => s + t.amount, 0)}
            accent="text-wyra-blue"
            currency={displayCurrency}
          />
          <StatCard
            label="Months with expenses"
            count={expenseMonths.length}
            amount={expenseMonths.reduce((s, m) => s + m.amount, 0)}
            accent="text-lime"
            currency={displayCurrency}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Expenses by tool"
            subtitle="Top tools by amount (count in legend)"
          >
            <div className="h-72">
              {expenseTools.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseTools}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {expenseTools.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, item) => {
                        const count = (item?.payload as { value?: number })?.value ?? 0
                        return [
                          `${formatMoney(Number(value) || 0, displayCurrency)} · ${count} rows`,
                          String(name),
                        ]
                      }}
                    />
                    <Legend wrapperStyle={{ color: chartMuted }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Expenses by month"
            subtitle={`Spend amounts (${displayCurrency})`}
          >
            <div className="h-72">
              {expenseMonths.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseMonths} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: chartMuted, fontSize: 11 }}
                      tickFormatter={(v) => shortMoneyAxis(Number(v) || 0, displayCurrency)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _name, item) => {
                        const count = (item?.payload as { count?: number })?.count ?? 0
                        return [
                          `${formatMoney(Number(value) || 0, displayCurrency)} · ${count} rows`,
                          'Spend',
                        ]
                      }}
                    />
                    <Bar dataKey="amount" name="amount" fill="#7c73b5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>
      </section>

      {/* Forecast */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-theme-fg">6-month forecast</h2>
          <p className="mt-1 text-sm text-theme-muted">
            Projected from Onboarding &amp; Invoices cycles (invoice amount × cycle). Paid vs
            pending split uses each client&apos;s historical paid ratio. Filtered by{' '}
            {displayCurrency}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Forecast raised (6 mo)"
            count={forecastTotals.raisedCount}
            amount={forecastTotals.raisedAmount}
            accent="text-wyra-blue"
            currency={displayCurrency}
          />
          <StatCard
            label="Forecast paid (6 mo)"
            count={forecastTotals.paidCount}
            amount={forecastTotals.paidAmount}
            accent="text-aqua"
            currency={displayCurrency}
          />
          <StatCard
            label="Forecast pending (6 mo)"
            count={forecastTotals.pendingCount}
            amount={forecastTotals.pendingAmount}
            accent="text-amber-400"
            currency={displayCurrency}
          />
        </div>

        <ChartCard title="Future invoices & amounts" subtitle={`Next 6 calendar months · ${displayCurrency}`}>
          <div className="h-80">
            {forecast.every((m) => m.raisedAmount === 0) ? (
              <EmptyChart message="Add invoice amount + cycle on Onboarding & Invoices to project future months." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartMuted, fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: chartMuted, fontSize: 11 }}
                    tickFormatter={(v) => shortMoneyAxis(Number(v) || 0, displayCurrency)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      formatMoney(Number(value) || 0, displayCurrency),
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ color: chartMuted }} />
                  <Bar dataKey="raisedAmount" name="Raised" fill="#00a0f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paidAmount" name="Paid" fill="#1fcc9a" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="pendingAmount"
                    name="Pending"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>
    </div>
  )
}

function EmptyChart({ message = 'No data for the selected filters.' }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-theme-muted">
      {message}
    </div>
  )
}
