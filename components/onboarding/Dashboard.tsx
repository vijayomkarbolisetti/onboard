'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, LayoutDashboard } from 'lucide-react'
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
  matchesYearMonth,
  MONTH_OPTIONS,
  amountForAnalytics,
  toMonthKey,
  type AnalyticsMoneyOpts,
} from '@/lib/dashboardAnalytics'
import { formatMoney, shortMoneyAxis } from '@/lib/currency'
import { formatFxBanner, FX_DISPLAY_CURRENCIES } from '@/lib/fx'
import { buildAndDownloadDashboardReport, downloadExpenseMonthToolsExcel, downloadInvoiceModalExcel } from '@/lib/dashboardExcel'
import { useFxRates } from '@/hooks/useFxRates'
import { formatCompanyNames, resolveInvoiceNumber } from '@/utils/format'
import {
  ChartCard,
  ClientDetailsModal,
  EmptyChart,
  ExpenseToolDetailsModal,
  ExpenseMonthToolsModal,
  FxRateInfo,
  InvoiceSummaryModal,
  MonthYearFilters,
  StatCard,
  type ClientDetailRow,
  type ExpenseToolRecordRow,
  type ExpenseMonthToolRow,
  type InvoiceDetailRow,
} from '@/components/onboarding/dashboard/DashboardComponents'
import { ExpensesSection, ForecastSection } from '@/components/onboarding/dashboard/DashboardSections'
import { ClientsSection } from '@/components/onboarding/dashboard/DashboardClientSection'
import type {
  Expense,
  Onboarding,
  OnboardingInvoiceRecord,
  OpenInvoice,
  PaidInvoice,
} from '@/types'

interface DashboardProps {
  onboardings: Onboarding[]
  onboardingInvoices: OnboardingInvoiceRecord[]
  paidInvoices: PaidInvoice[]
  openInvoices: OpenInvoice[]
  expenses: Expense[]
  loading?: boolean
  error?: string | null
}

type InvoiceModalMode = 'raised' | 'paid' | 'pending'

function normalizeClientStatus(value: string | null | undefined): string {
  return (value ?? 'unknown').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeToolName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
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
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceModalMode, setInvoiceModalMode] = useState<InvoiceModalMode>('raised')
  const [invoiceModalMonthKey, setInvoiceModalMonthKey] = useState<string | null>(null)
  const [clientDetailOpen, setClientDetailOpen] = useState(false)
  const [selectedClientMonthKey, setSelectedClientMonthKey] = useState<string | null>(null)
  const [selectedClientStatus, setSelectedClientStatus] = useState<string | null>(null)
  const [selectedExpenseTool, setSelectedExpenseTool] = useState<string | null>(null)
  const [expenseToolMonthModalOpen, setExpenseToolMonthModalOpen] = useState(false)
  const [expenseMonthToolsModalOpen, setExpenseMonthToolsModalOpen] = useState(false)
  const [selectedExpenseToolMonthKey, setSelectedExpenseToolMonthKey] = useState<string | null>(null)

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

  const openClientDetail = (monthKey: string | null, status: string | null = null) => {
    setSelectedClientMonthKey(monthKey)
    setSelectedClientStatus(status)
    setClientDetailOpen(true)
  }

  const selectedClientMonthLabel = useMemo(() => {
    if (!selectedClientMonthKey) return 'All selected months'
    return clientMonths.find((row) => row.key === selectedClientMonthKey)?.label ?? selectedClientMonthKey
  }, [selectedClientMonthKey, clientMonths])

  const clientDetailFilterLabel = useMemo(() => {
    const monthPart = selectedClientMonthLabel
    const statusPart = selectedClientStatus ? ` · ${selectedClientStatus}` : ''
    return `${monthPart}${statusPart}`
  }, [selectedClientMonthLabel, selectedClientStatus])

  const clientDetailRows = useMemo<ClientDetailRow[]>(() => {
    const statusKey = selectedClientStatus ? normalizeClientStatus(selectedClientStatus) : null
    const rows = filteredClients
      .filter((row) => {
        if (!selectedClientMonthKey) return true
        return toMonthKey(row.onboardingDate) === selectedClientMonthKey
      })
      .filter((row) => {
        if (!statusKey) return true
        return normalizeClientStatus(row.status) === statusKey
      })
      .map((row) => ({
        id: row.id,
        organization: row.organization || '—',
        status: (row.status || 'Unknown').trim() || 'Unknown',
        onboardingDate: row.onboardingDate,
        committedAmountDisplay: Number(
          amountForAnalytics(row.committedAmount, row.currency, row.committedAmount, moneyOpts).toFixed(2),
        ),
      }))
    return rows.sort((a, b) => (a.onboardingDate > b.onboardingDate ? -1 : 1))
  }, [filteredClients, selectedClientMonthKey, selectedClientStatus, moneyOpts])

  const invoiceSummary = useMemo(
    () => invoiceTotals(paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts),
    [paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts],
  )

  const invoiceMonths = useMemo(
    () => invoiceStatsByMonth(paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts),
    [paidInvoices, openInvoices, invoiceMonth, invoiceYear, moneyOpts],
  )

  const forecast = useMemo(
    () => forecastNextMonths(onboardingInvoices, 3, new Date(), moneyOpts),
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

  const handleExpenseToolSelect = (toolName: string | null) => {
    if (!toolName) return
    setSelectedExpenseTool((prev) =>
      prev && normalizeToolName(prev) === normalizeToolName(toolName) ? null : toolName,
    )
    setSelectedExpenseToolMonthKey(null)
    setExpenseToolMonthModalOpen(false)
    setExpenseMonthToolsModalOpen(false)
  }

  const expenseMonthsForChart = useMemo(() => {
    if (!selectedExpenseTool) return expenseMonths
    const toolKey = normalizeToolName(selectedExpenseTool)
    const byMonth = new Map<string, { key: string; label: string; count: number; amount: number }>()
    for (const row of expenses) {
      if (!matchesYearMonth(row.invoiceDate, expenseMonth, expenseYear)) continue
      if (normalizeToolName(row.toolName) !== toolKey) continue
      const key = toMonthKey(row.invoiceDate)
      if (!key) continue
      const prev = byMonth.get(key) ?? {
        key,
        label: new Date(`${key}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: 0,
        amount: 0,
      }
      prev.count += 1
      prev.amount += amountForAnalytics(row.amount, row.currency, row.amount, moneyOpts)
      byMonth.set(key, prev)
    }
    return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [selectedExpenseTool, expenseMonths, expenses, expenseMonth, expenseYear, moneyOpts])

  const selectedExpenseToolRecords = useMemo<ExpenseToolRecordRow[]>(() => {
    if (!selectedExpenseTool) return []
    const toolKey = normalizeToolName(selectedExpenseTool)
    return expenses
      .filter((row) => matchesYearMonth(row.invoiceDate, expenseMonth, expenseYear))
      .filter((row) => normalizeToolName(row.toolName) === toolKey)
      .filter((row) =>
        selectedExpenseToolMonthKey ? toMonthKey(row.invoiceDate) === selectedExpenseToolMonthKey : true,
      )
      .map((row) => ({
        id: row.id,
        invoiceDate: row.invoiceDate,
        cardUsed: row.cardUsed || '—',
        cardOwner: row.cardOwner || '—',
        displayAmount: Number(
          amountForAnalytics(row.amount, row.currency, row.amount, moneyOpts).toFixed(2),
        ),
      }))
      .sort((a, b) => (a.invoiceDate > b.invoiceDate ? -1 : 1))
  }, [
    selectedExpenseTool,
    selectedExpenseToolMonthKey,
    expenses,
    expenseMonth,
    expenseYear,
    moneyOpts,
  ])

  const selectedExpenseToolMonthRows = useMemo(
    () =>
      selectedExpenseToolMonthKey
        ? expenseMonthsForChart.filter((m) => m.key === selectedExpenseToolMonthKey)
        : expenseMonthsForChart,
    [expenseMonthsForChart, selectedExpenseToolMonthKey],
  )

  const selectedExpenseToolMonthLabel = useMemo(() => {
    if (!selectedExpenseToolMonthKey) return 'All months'
    return (
      expenseMonthsForChart.find((m) => m.key === selectedExpenseToolMonthKey)?.label ??
      selectedExpenseToolMonthKey
    )
  }, [expenseMonthsForChart, selectedExpenseToolMonthKey])

  const selectedMonthTools = useMemo<ExpenseMonthToolRow[]>(() => {
    if (!selectedExpenseToolMonthKey) return []
    const byTool = new Map<string, ExpenseMonthToolRow>()
    for (const row of expenses) {
      if (!matchesYearMonth(row.invoiceDate, expenseMonth, expenseYear)) continue
      if (toMonthKey(row.invoiceDate) !== selectedExpenseToolMonthKey) continue
      const key = normalizeToolName(row.toolName)
      if (!key) continue
      const name = (row.toolName || 'Unknown').trim() || 'Unknown'
      const prev = byTool.get(key) ?? { name, count: 0, amount: 0 }
      prev.count += 1
      prev.amount += amountForAnalytics(row.amount, row.currency, row.amount, moneyOpts)
      byTool.set(key, prev)
    }
    return [...byTool.values()]
      .map((t) => ({ ...t, amount: Number(t.amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
  }, [selectedExpenseToolMonthKey, expenses, expenseMonth, expenseYear, moneyOpts])

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

  const invoicePeriodLabel = useMemo(() => {
    const monthLabel =
      MONTH_OPTIONS.find((m) => m.value === invoiceMonth)?.label ?? 'All months'
    const yearLabel = invoiceYear || 'All years'
    return `${monthLabel} · ${yearLabel} · ${displayCurrency}`
  }, [invoiceMonth, invoiceYear, displayCurrency])

  const openInvoiceModal = (mode: InvoiceModalMode, monthKey: string | null = null) => {
    setInvoiceModalMode(mode)
    setInvoiceModalMonthKey(monthKey)
    setInvoiceModalOpen(true)
  }

  const invoiceModalPaid = useMemo(() => {
    const periodFiltered = paidInvoices.filter((inv) =>
      matchesYearMonth(inv.invoiceDate, invoiceMonth, invoiceYear),
    )
    if (!invoiceModalMonthKey) return periodFiltered
    return periodFiltered.filter((inv) => toMonthKey(inv.invoiceDate) === invoiceModalMonthKey)
  }, [paidInvoices, invoiceMonth, invoiceYear, invoiceModalMonthKey])

  const invoiceModalPending = useMemo(() => {
    const periodFiltered = openInvoices.filter((inv) =>
      matchesYearMonth(inv.invoiceDate, invoiceMonth, invoiceYear),
    )
    if (!invoiceModalMonthKey) return periodFiltered
    return periodFiltered.filter((inv) => toMonthKey(inv.invoiceDate) === invoiceModalMonthKey)
  }, [openInvoices, invoiceMonth, invoiceYear, invoiceModalMonthKey])

  const modalPaidRows = useMemo<InvoiceDetailRow[]>(
    () =>
      invoiceModalPaid.map((inv) => ({
        type: 'Paid',
        invoiceDate: inv.invoiceDate,
        customerName: inv.customerName ?? '',
        companyName: formatCompanyNames(inv.companyName),
        invoiceNumber: resolveInvoiceNumber(inv as unknown as Record<string, unknown>),
        invoiceAmountRaw: inv.invoiceAmount,
        currency: inv.currency ?? 'USD',
        displayAmount: Number(
          amountForAnalytics(inv.invoiceAmount, inv.currency, inv.invoiceAmount, moneyOpts).toFixed(
            2,
          ),
        ),
        status: inv.status ?? '',
      })),
    [invoiceModalPaid, moneyOpts],
  )

  const modalPendingRows = useMemo<InvoiceDetailRow[]>(
    () =>
      invoiceModalPending.map((inv) => ({
        type: 'Pending',
        invoiceDate: inv.invoiceDate,
        customerName: inv.customerName ?? '',
        companyName: formatCompanyNames(inv.companyName),
        invoiceNumber: resolveInvoiceNumber(inv as unknown as Record<string, unknown>),
        invoiceAmountRaw: inv.invoiceAmount,
        currency: inv.currency ?? 'USD',
        displayAmount: Number(
          amountForAnalytics(inv.invoiceAmount, inv.currency, inv.invoiceAmount, moneyOpts).toFixed(
            2,
          ),
        ),
        status: inv.status ?? '',
      })),
    [invoiceModalPending, moneyOpts],
  )

  const invoiceModalRows = useMemo(() => {
    if (invoiceModalMode === 'paid') return modalPaidRows
    if (invoiceModalMode === 'pending') return modalPendingRows
    return [...modalPaidRows, ...modalPendingRows].sort((a, b) =>
      a.invoiceDate > b.invoiceDate ? -1 : 1,
    )
  }, [invoiceModalMode, modalPaidRows, modalPendingRows])

  const invoiceModalSummary = useMemo(() => {
    const paidRows = invoiceModalRows.filter((row) => row.type === 'Paid')
    const pendingRows = invoiceModalRows.filter((row) => row.type === 'Pending')
    const paidAmount = paidRows.reduce((s, row) => s + row.displayAmount, 0)
    const pendingAmount = pendingRows.reduce((s, row) => s + row.displayAmount, 0)
    return {
      raisedCount: invoiceModalRows.length,
      raisedAmount: paidAmount + pendingAmount,
      paidCount: paidRows.length,
      paidAmount,
      pendingCount: pendingRows.length,
      pendingAmount,
    }
  }, [invoiceModalRows])

  const invoiceModalTitle = useMemo(() => {
    if (invoiceModalMode === 'paid') return 'Paid invoices details'
    if (invoiceModalMode === 'pending') return 'Pending invoices details'
    return 'Total invoices details'
  }, [invoiceModalMode])

  const invoiceModalPeriodLabel = useMemo(() => {
    if (!invoiceModalMonthKey) return invoicePeriodLabel
    const month = invoiceMonths.find((row) => row.key === invoiceModalMonthKey)?.label ?? invoiceModalMonthKey
    return `${month} · ${displayCurrency}`
  }, [invoiceModalMonthKey, invoicePeriodLabel, invoiceMonths, displayCurrency])

  const handleInvoiceExcelDownload = () => {
    downloadInvoiceModalExcel({
      title: invoiceModalTitle,
      periodLabel: invoiceModalPeriodLabel,
      displayCurrency,
      summary: invoiceModalSummary,
      rows: invoiceModalRows,
    })
  }

  if (loading) {
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
    <>
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

      <ClientsSection
        clientMonth={clientMonth}
        clientYear={clientYear}
        clientYears={clientYears}
        onClientMonth={setClientMonth}
        onClientYear={setClientYear}
        filteredClientCount={filteredClients.length}
        committedTotal={committedTotal}
        statusSlices={statusSlices}
        clientMonths={clientMonths}
        displayCurrency={displayCurrency}
        chartMuted={chartMuted}
        gridStroke={gridStroke}
        tooltipStyle={tooltipStyle}
        onStatusClick={(status) => openClientDetail(null, status)}
        onMonthClick={(monthKey) => openClientDetail(monthKey)}
      />

      {/* Invoices */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-theme-fg">Invoices</h2>
            <p className="mt-1 text-sm text-theme-muted">
              Raised = paid + pending · separate month/year filter
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <MonthYearFilters
              month={invoiceMonth}
              year={invoiceYear}
              years={invoiceYears}
              onMonth={setInvoiceMonth}
              onYear={setInvoiceYear}
            />
            <button
              type="button"
              onClick={() => openInvoiceModal('raised')}
              className="btn-wyra mb-0.5 inline-flex items-center gap-2"
            >
              View summary
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total invoices raised"
            count={invoiceSummary.raisedCount}
            amount={invoiceSummary.raisedAmount}
            accent="text-wyra-blue"
            currency={displayCurrency}
            onClick={() => openInvoiceModal('raised')}
          />
          <StatCard
            label="Paid invoices"
            count={invoiceSummary.paidCount}
            amount={invoiceSummary.paidAmount}
            accent="text-aqua"
            currency={displayCurrency}
            onClick={() => openInvoiceModal('paid')}
          />
          <StatCard
            label="Pending invoices"
            count={invoiceSummary.pendingCount}
            amount={invoiceSummary.pendingAmount}
            accent="text-amber-400"
            currency={displayCurrency}
            onClick={() => openInvoiceModal('pending')}
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
                  <Bar
                    dataKey="raisedAmount"
                    name="Raised"
                    fill="#00a0f0"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    onClick={(row) =>
                      openInvoiceModal(
                        'raised',
                        (row as { key?: string } | undefined)?.key ?? null,
                      )
                    }
                  />
                  <Bar
                    dataKey="paidAmount"
                    name="Paid"
                    fill="#1fcc9a"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    onClick={(row) =>
                      openInvoiceModal(
                        'paid',
                        (row as { key?: string } | undefined)?.key ?? null,
                      )
                    }
                  />
                  <Bar
                    dataKey="pendingAmount"
                    name="Pending"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    onClick={(row) =>
                      openInvoiceModal(
                        'pending',
                        (row as { key?: string } | undefined)?.key ?? null,
                      )
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      <ExpensesSection
        displayCurrency={displayCurrency}
        chartMuted={chartMuted}
        gridStroke={gridStroke}
        tooltipStyle={tooltipStyle}
        expenseMonth={expenseMonth}
        expenseYear={expenseYear}
        expenseYears={expenseYears}
        onExpenseMonth={setExpenseMonth}
        onExpenseYear={setExpenseYear}
        expenseSummary={expenseSummary}
        expenseTools={expenseTools}
        expenseMonths={expenseMonthsForChart}
        selectedToolName={selectedExpenseTool}
        onToolClick={handleExpenseToolSelect}
        onToolReset={() => {
          setSelectedExpenseTool(null)
          setSelectedExpenseToolMonthKey(null)
          setExpenseToolMonthModalOpen(false)
          setExpenseMonthToolsModalOpen(false)
        }}
        onMonthBarClick={(monthKey) => {
          if (!monthKey) return
          setSelectedExpenseToolMonthKey(monthKey)
          if (selectedExpenseTool) {
            setExpenseMonthToolsModalOpen(false)
            setExpenseToolMonthModalOpen(true)
          } else {
            setExpenseToolMonthModalOpen(false)
            setExpenseMonthToolsModalOpen(true)
          }
        }}
      />

      <ForecastSection
        displayCurrency={displayCurrency}
        chartMuted={chartMuted}
        gridStroke={gridStroke}
        tooltipStyle={tooltipStyle}
        forecastTotals={forecastTotals}
        forecast={forecast}
      />
    </div>

      <ClientDetailsModal
        open={clientDetailOpen}
        onClose={() => setClientDetailOpen(false)}
        filterLabel={clientDetailFilterLabel}
        displayCurrency={displayCurrency}
        rows={clientDetailRows}
      />

      <ExpenseToolDetailsModal
        open={expenseToolMonthModalOpen}
        onClose={() => setExpenseToolMonthModalOpen(false)}
        toolName={selectedExpenseTool ?? 'Tool'}
        periodLabel={`${selectedExpenseToolMonthLabel} · ${displayCurrency}`}
        displayCurrency={displayCurrency}
        monthRows={selectedExpenseToolMonthRows}
        rows={selectedExpenseToolRecords}
      />

      <ExpenseMonthToolsModal
        open={expenseMonthToolsModalOpen}
        onClose={() => setExpenseMonthToolsModalOpen(false)}
        monthLabel={selectedExpenseToolMonthLabel}
        displayCurrency={displayCurrency}
        tools={selectedMonthTools}
        onDownload={() =>
          downloadExpenseMonthToolsExcel({
            monthLabel: selectedExpenseToolMonthLabel,
            displayCurrency,
            tools: selectedMonthTools,
          })
        }
      />

      <InvoiceSummaryModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        displayCurrency={displayCurrency}
        title={invoiceModalTitle}
        summary={invoiceModalSummary}
        periodLabel={invoiceModalPeriodLabel}
        rows={invoiceModalRows}
        onDownload={handleInvoiceExcelDownload}
      />
    </>
  )
}

