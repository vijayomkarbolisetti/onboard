'use client'

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
import { ChartCard, EmptyChart, MonthYearFilters, StatCard } from './DashboardComponents'
import { formatMoney, shortMoneyAxis } from '@/lib/currency'
import type { ForecastMonth, StatusSlice, ExpenseMonthStats } from '@/lib/dashboardAnalytics'

const PIE_COLORS = [
  '#1fcc9a',
  '#00a0f0',
  '#a5c626',
  '#7c73b5',
  '#241f5b',
  '#f59e0b',
  '#ef4444',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#eab308',
  '#f97316',
  '#ec4899',
  '#10b981',
  '#3b82f6',
  '#84cc16',
]

function toolColor(index: number): string {
  if (index < PIE_COLORS.length) return PIE_COLORS[index]
  const hue = (index * 37) % 360
  return `hsl(${hue} 72% 46%)`
}

type TooltipStyle = {
  backgroundColor: string
  border: string
  borderRadius: number
  color: string
}

export function ExpensesSection({
  displayCurrency,
  chartMuted,
  gridStroke,
  tooltipStyle,
  expenseMonth,
  expenseYear,
  expenseYears,
  onExpenseMonth,
  onExpenseYear,
  expenseSummary,
  expenseTools,
  expenseMonths,
  selectedToolName,
  onToolClick,
  onToolReset,
  onMonthBarClick,
}: {
  displayCurrency: string
  chartMuted: string
  gridStroke: string
  tooltipStyle: TooltipStyle
  expenseMonth: string
  expenseYear: string
  expenseYears: string[]
  onExpenseMonth: (value: string) => void
  onExpenseYear: (value: string) => void
  expenseSummary: { count: number; amount: number }
  expenseTools: StatusSlice[]
  expenseMonths: ExpenseMonthStats[]
  selectedToolName: string | null
  onToolClick: (toolName: string | null) => void
  onToolReset: () => void
  onMonthBarClick: (monthKey: string | null) => void
}) {
  const selectedIndex = selectedToolName
    ? expenseTools.findIndex((t) => t.name.trim().toLowerCase() === selectedToolName.trim().toLowerCase())
    : -1
  const activeBarColor = selectedIndex >= 0 ? toolColor(selectedIndex) : '#7c73b5'

  return (
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
          onMonth={onExpenseMonth}
          onYear={onExpenseYear}
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
          subtitle="Top tools by amount (click a tool slice to view month-wise usage)"
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
                    paddingAngle={0}
                    stroke="none"
                    isAnimationActive={false}
                    className="cursor-pointer"
                    onClick={(entry, index) => {
                      const fromEntry =
                        typeof (entry as { name?: unknown } | undefined)?.name === 'string'
                          ? ((entry as { name?: string }).name ?? null)
                          : null
                      const fromIndex =
                        typeof index === 'number' ? expenseTools[index]?.name ?? null : null
                      onToolClick(fromEntry || fromIndex)
                    }}
                  >
                    {expenseTools.map((_, i) => (
                      <Cell
                        key={i}
                        fill={toolColor(i)}
                        stroke="none"
                        opacity={selectedIndex >= 0 && selectedIndex !== i ? 0.72 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name, item) => {
                      const count = (item?.payload as { value?: number })?.value ?? 0
                      return [`${formatMoney(Number(value) || 0, displayCurrency)} · ${count} records`, String(name)]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {expenseTools.length > 0 ? (
            <div className="mt-3 max-h-24 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {expenseTools.map((tool, idx) => {
                  const isActive =
                    selectedToolName?.trim().toLowerCase() === tool.name.trim().toLowerCase()
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => onToolClick(tool.name)}
                      className={
                        isActive
                          ? 'inline-flex items-center gap-1.5 rounded-full border border-aqua/50 bg-aqua/10 px-2 py-0.5 text-xs font-semibold text-aqua'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-theme px-2 py-0.5 text-xs text-theme-muted hover:bg-theme-hover'
                      }
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: toolColor(idx) }}
                      />
                      <span>{tool.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </ChartCard>

        <ChartCard
          title="Expenses by month"
          subtitle={
            selectedToolName
              ? `Spend for ${selectedToolName} (${displayCurrency}). Click a month for records.`
              : `Spend amounts (${displayCurrency}). Click a month to see tools used.`
          }
          actions={
            selectedToolName ? (
              <button
                type="button"
                onClick={onToolReset}
                className="rounded-lg border border-theme px-3 py-1.5 text-xs font-semibold text-theme-fg transition hover:bg-theme-hover"
              >
                Reset
              </button>
            ) : null
          }
        >
          <div className="h-64 pt-3 pb-4">
            {expenseMonths.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-full w-full">
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
                      return [`${formatMoney(Number(value) || 0, displayCurrency)} · ${count} records`, 'Spend']
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    name="amount"
                    fill={activeBarColor}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                    className="cursor-pointer"
                    onClick={(row) => {
                      onMonthBarClick((row as { key?: string } | undefined)?.key ?? null)
                    }}
                  />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </section>
  )
}

export function ForecastSection({
  displayCurrency,
  chartMuted,
  gridStroke,
  tooltipStyle,
  forecastTotals,
  forecast,
}: {
  displayCurrency: string
  chartMuted: string
  gridStroke: string
  tooltipStyle: TooltipStyle
  forecastTotals: {
    raisedCount: number
    raisedAmount: number
    paidCount: number
    paidAmount: number
    pendingCount: number
    pendingAmount: number
  }
  forecast: ForecastMonth[]
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-theme-fg">Forecast window</h2>
        <p className="mt-1 text-sm text-theme-muted">
          Projected from Onboarding &amp; Invoices cycles (invoice amount × cycle). Paid vs
          pending split uses each client&apos;s historical paid ratio. Past 3 + current + next 3 months.
          Filtered by {displayCurrency}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Forecast raised (3+3)"
          count={forecastTotals.raisedCount}
          amount={forecastTotals.raisedAmount}
          accent="text-wyra-blue"
          currency={displayCurrency}
        />
        <StatCard
          label="Forecast paid (3+3)"
          count={forecastTotals.paidCount}
          amount={forecastTotals.paidAmount}
          accent="text-aqua"
          currency={displayCurrency}
        />
        <StatCard
          label="Forecast pending (3+3)"
          count={forecastTotals.pendingCount}
          amount={forecastTotals.pendingAmount}
          accent="text-amber-400"
          currency={displayCurrency}
        />
      </div>

      <ChartCard
        title="Invoices & amounts window"
        subtitle={`Past 3 + current + next 3 months · ${displayCurrency}`}
      >
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
                <Bar
                  dataKey="raisedAmount"
                  name="Raised"
                  fill="#00a0f0"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="paidAmount"
                  name="Paid"
                  fill="#1fcc9a"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="pendingAmount"
                  name="Pending"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>
    </section>
  )
}
