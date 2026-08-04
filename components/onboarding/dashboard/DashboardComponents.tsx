'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Info, X } from 'lucide-react'
import { WyraSelect } from '@/components/CompanyNameSelect'
import { MONTH_OPTIONS, toMonthKey } from '@/lib/dashboardAnalytics'
import { formatMoney } from '@/lib/currency'
import { formatExportDate } from '@/lib/excelUtils'
import { cn } from '@/lib/utils'

export type InvoiceDetailRow = {
  type: 'Paid' | 'Pending'
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmountRaw: string | number | undefined | null
  currency: string
  displayAmount: number
  status: string
}

export type ClientDetailRow = {
  id: string
  organization: string
  status: string
  onboardingDate: string
  committedAmountDisplay: number
}

export type ExpenseToolRecordRow = {
  id: string
  invoiceDate: string
  cardUsed: string
  cardOwner: string
  displayAmount: number
}

export type ExpenseToolMonthRow = {
  key: string
  label: string
  count: number
  amount: number
}

export type ExpenseMonthToolRow = {
  name: string
  count: number
  amount: number
}

export function StatCard({
  label,
  count,
  amount,
  accent,
  currency,
  amountLabel = 'Amount',
  onClick,
}: {
  label: string
  count: number
  amount: number
  accent: string
  currency: string
  amountLabel?: string
  onClick?: () => void
}) {
  const interactive = Boolean(onClick)
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'glass-card rounded-2xl border border-theme p-5',
        interactive &&
          'cursor-pointer transition hover:border-aqua/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40',
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">{label}</p>
          <p className={cn('mt-2 text-3xl font-bold tracking-tight', accent)}>{count}</p>
        </div>
        <div className="sm:border-l sm:border-theme sm:pl-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
            {amountLabel}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-theme-fg">
            {formatMoney(amount, currency)}
          </p>
          {interactive ? (
            <p className="mt-2 text-[11px] font-medium text-aqua">Click for details · Excel</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ChartCard({
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

export function MonthYearFilters({
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

export function FxRateInfo({
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
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
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
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
            FX conversion
          </p>
          <p className="mt-1 text-sm font-semibold text-theme-fg">
            Display currency: {displayCurrency}
          </p>
          {loading ? (
            <p className="mt-2 text-sm text-theme-muted">Loading latest rates…</p>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-theme-fg">
              {rateLines.length > 0 ? rateLines.map((line) => <p key={line}>{line}</p>) : <p>—</p>}
            </div>
          )}
          <p className="mt-2 text-xs text-theme-muted">
            Date: {date || 'N/A'} · Source: {source || 'Fallback'}
          </p>
          {warning ? <p className="mt-2 text-xs text-amber-400">{warning}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function EmptyChart({ message = 'No data for the selected filters.' }: { message?: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-theme-muted">{message}</div>
}

function useModalOpenGuard(open: boolean) {
  const justOpenedRef = useRef(true)
  useEffect(() => {
    if (!open) return
    justOpenedRef.current = true
    const t = window.setTimeout(() => {
      justOpenedRef.current = false
    }, 250)
    return () => window.clearTimeout(t)
  }, [open])
  return justOpenedRef
}

export function ClientDetailsModal({
  open,
  onClose,
  filterLabel,
  displayCurrency,
  rows,
}: {
  open: boolean
  onClose: () => void
  filterLabel: string
  displayCurrency: string
  rows: ClientDetailRow[]
}) {
  if (!open) return null
  const justOpenedRef = useModalOpenGuard(open)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={() => {
          if (justOpenedRef.current) return
          onClose()
        }}
        aria-label="Close client details"
      />
      <div className="relative w-full max-w-4xl overflow-hidden theme-modal">
        <div className="h-1 bg-wyra-gradient" />
        <div className="flex items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">Client details</h2>
            <p className="mt-1 text-sm text-theme-muted">{filterLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-3 rounded-xl border border-theme bg-theme-elevated/40 px-3 py-2 text-sm">
            <span className="font-semibold text-theme-fg">{rows.length}</span>{' '}
            <span className="text-theme-muted">clients in this selection</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-theme">
            <div className="grid grid-cols-[96px_1.4fr_0.8fr_132px] gap-2 bg-theme-elevated px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
              <span>Date</span>
              <span>Client</span>
              <span>Status</span>
              <span className="text-right">Committed</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-theme-muted">No clients found for this selection.</p>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[96px_1.4fr_0.8fr_132px] gap-2 border-t border-theme px-3 py-2 text-xs text-theme-body"
                  >
                    <span>{formatExportDate(row.onboardingDate)}</span>
                    <span className="truncate" title={row.organization}>
                      {row.organization}
                    </span>
                    <span className="capitalize">{row.status || 'Unknown'}</span>
                    <span className="text-right font-semibold">
                      {formatMoney(row.committedAmountDisplay, displayCurrency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExpenseToolDetailsModal({
  open,
  onClose,
  toolName,
  periodLabel,
  displayCurrency,
  monthRows,
  rows,
}: {
  open: boolean
  onClose: () => void
  toolName: string
  periodLabel: string
  displayCurrency: string
  monthRows: ExpenseToolMonthRow[]
  rows: ExpenseToolRecordRow[]
}) {
  if (!open) return null
  const justOpenedRef = useModalOpenGuard(open)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null)
  const visibleRows = selectedMonthKey
    ? rows.filter((row) => toMonthKey(row.invoiceDate) === selectedMonthKey)
    : rows

  useEffect(() => {
    if (!open) {
      setSelectedMonthKey(null)
      return
    }
    setSelectedMonthKey(null)
  }, [open, toolName, periodLabel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={() => {
          if (justOpenedRef.current) return
          onClose()
        }}
        aria-label="Close expense tool details"
      />
      <div className="relative w-full max-w-5xl overflow-hidden theme-modal">
        <div className="h-1 bg-wyra-gradient" />
        <div className="flex items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">{toolName} usage details</h2>
            <p className="mt-1 text-sm text-theme-muted">{periodLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-theme">
            <div className="grid grid-cols-[1fr_90px_120px] gap-2 bg-theme-elevated px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
              <span>Month</span>
              <span className="text-right">Records</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {monthRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-theme-muted">No month-wise data found.</p>
              ) : (
                monthRows.map((row) => (
                  <div
                    key={row.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMonthKey(row.key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedMonthKey(row.key)
                      }
                    }}
                    className={cn(
                      'grid grid-cols-[1fr_90px_120px] gap-2 border-t border-theme px-3 py-2 text-xs text-theme-body transition',
                      'cursor-pointer hover:bg-theme-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40',
                      selectedMonthKey === row.key && 'bg-theme-hover',
                    )}
                  >
                    <span>{row.label}</span>
                    <span className="text-right">{row.count}</span>
                    <span className="text-right font-semibold">
                      {formatMoney(row.amount, displayCurrency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-theme">
            <div className="flex items-center justify-between border-b border-theme bg-theme-elevated/30 px-3 py-2 text-[11px] text-theme-muted">
              <span>
                {selectedMonthKey
                  ? `Showing ${monthRows.find((m) => m.key === selectedMonthKey)?.label ?? selectedMonthKey}`
                  : 'Showing all months'}
              </span>
              {selectedMonthKey ? (
                <button
                  type="button"
                  onClick={() => setSelectedMonthKey(null)}
                  className="rounded border border-theme px-2 py-0.5 text-[11px] text-theme-fg hover:bg-theme-hover"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-[96px_1fr_1fr_120px] gap-2 bg-theme-elevated px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
              <span>Date</span>
              <span>Card</span>
              <span>Owner</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {visibleRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-theme-muted">No expense records found.</p>
              ) : (
                visibleRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[96px_1fr_1fr_120px] gap-2 border-t border-theme px-3 py-2 text-xs text-theme-body"
                  >
                    <span>{formatExportDate(row.invoiceDate)}</span>
                    <span className="truncate" title={row.cardUsed}>
                      {row.cardUsed}
                    </span>
                    <span className="truncate" title={row.cardOwner}>
                      {row.cardOwner}
                    </span>
                    <span className="text-right font-semibold">
                      {formatMoney(row.displayAmount, displayCurrency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExpenseMonthToolsModal({
  open,
  onClose,
  monthLabel,
  displayCurrency,
  tools,
  onDownload,
}: {
  open: boolean
  onClose: () => void
  monthLabel: string
  displayCurrency: string
  tools: ExpenseMonthToolRow[]
  onDownload: () => void
}) {
  if (!open) return null
  const justOpenedRef = useModalOpenGuard(open)
  const totalAmount = tools.reduce((s, t) => s + t.amount, 0)
  const totalRecords = tools.reduce((s, t) => s + t.count, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={() => {
          if (justOpenedRef.current) return
          onClose()
        }}
        aria-label="Close month tools details"
      />
      <div className="relative w-full max-w-3xl overflow-hidden theme-modal">
        <div className="h-1 bg-wyra-gradient" />
        <div className="flex items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">Tools used in {monthLabel}</h2>
            <p className="mt-1 text-sm text-theme-muted">
              {tools.length} different tools · {totalRecords} records ·{' '}
              {formatMoney(totalAmount, displayCurrency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-hidden rounded-2xl border border-theme">
            <div className="grid grid-cols-[1.4fr_90px_140px] gap-2 bg-theme-elevated px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
              <span>Tool</span>
              <span className="text-right">Records</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {tools.length === 0 ? (
                <p className="px-3 py-4 text-sm text-theme-muted">No tools found for this month.</p>
              ) : (
                tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="grid grid-cols-[1.4fr_90px_140px] gap-2 border-t border-theme px-3 py-2 text-xs text-theme-body"
                  >
                    <span className="truncate font-medium" title={tool.name}>
                      {tool.name}
                    </span>
                    <span className="text-right">{tool.count}</span>
                    <span className="text-right font-semibold">
                      {formatMoney(tool.amount, displayCurrency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-theme px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={tools.length === 0}
            className="btn-wyra inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Download size={16} />
            Download Excel
          </button>
        </div>
      </div>
    </div>
  )
}

export function InvoiceSummaryModal({
  open,
  onClose,
  title,
  displayCurrency,
  summary,
  periodLabel,
  rows,
  onDownload,
}: {
  open: boolean
  onClose: () => void
  title: string
  displayCurrency: string
  summary: {
    raisedCount: number
    raisedAmount: number
    paidCount: number
    paidAmount: number
    pendingCount: number
    pendingAmount: number
  }
  periodLabel: string
  rows: InvoiceDetailRow[]
  onDownload: () => void
}) {
  if (!open) return null
  const justOpenedRef = useModalOpenGuard(open)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={() => {
          if (justOpenedRef.current) return
          onClose()
        }}
        aria-label="Close invoice summary"
      />
      <div className="relative w-full max-w-5xl overflow-hidden theme-modal">
        <div className="h-1 bg-wyra-gradient" />
        <div className="flex items-start justify-between gap-3 border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">{title}</h2>
            <p className="mt-1 text-sm text-theme-muted">{periodLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 p-6">
          <div className="rounded-2xl border border-theme bg-theme-elevated/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Total raised</p>
            <p className="mt-1 text-2xl font-bold text-wyra-blue">{summary.raisedCount}</p>
            <p className="text-sm font-semibold text-theme-fg">
              {formatMoney(summary.raisedAmount, displayCurrency)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-theme bg-theme-elevated/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">Total paid</p>
              <p className="mt-1 text-2xl font-bold text-aqua">{summary.paidCount}</p>
              <p className="text-sm font-semibold text-theme-fg">
                {formatMoney(summary.paidAmount, displayCurrency)}
              </p>
            </div>
            <div className="rounded-2xl border border-theme bg-theme-elevated/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
                Total pending
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-400">{summary.pendingCount}</p>
              <p className="text-sm font-semibold text-theme-fg">
                {formatMoney(summary.pendingAmount, displayCurrency)}
              </p>
            </div>
          </div>
          <p className="text-xs text-theme-muted">
            Raised = paid + pending. Amounts are shown in {displayCurrency}.
          </p>
          <div className="overflow-hidden rounded-2xl border border-theme">
            <div className="grid grid-cols-[100px_minmax(0,1.2fr)_minmax(0,1.4fr)_90px_130px] gap-3 bg-theme-elevated px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
              <span>Date</span>
              <span>Customer</span>
              <span>Company</span>
              <span className="text-right">Type</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-theme-muted">No invoices for this selection.</p>
              ) : (
                rows.map((row, idx) => (
                  <div
                    key={`${row.invoiceNumber}-${idx}`}
                    className="grid grid-cols-[100px_minmax(0,1.2fr)_minmax(0,1.4fr)_90px_130px] gap-3 border-t border-theme px-3 py-2 text-xs text-theme-body"
                  >
                    <span>{formatExportDate(row.invoiceDate)}</span>
                    <span className="truncate" title={row.customerName}>
                      {row.customerName || '—'}
                    </span>
                    <span className="truncate" title={row.companyName}>
                      {row.companyName || '—'}
                    </span>
                    <span
                      className={cn(
                        'text-right font-semibold',
                        row.type === 'Paid' ? 'text-aqua' : 'text-amber-400',
                      )}
                    >
                      {row.type}
                    </span>
                    <span className="text-right font-semibold">
                      {formatMoney(row.displayAmount, displayCurrency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-theme px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
          >
            Close
          </button>
          <button type="button" onClick={onDownload} className="btn-wyra inline-flex items-center gap-2">
            <Download size={16} />
            Download Excel
          </button>
        </div>
      </div>
    </div>
  )
}
