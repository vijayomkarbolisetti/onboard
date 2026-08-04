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
import { ChartCard, EmptyChart, MonthYearFilters } from './DashboardComponents'
import { formatMoney } from '@/lib/currency'
import type { MonthBucket, StatusSlice } from '@/lib/dashboardAnalytics'

const PIE_COLORS = ['#1fcc9a', '#00a0f0', '#a5c626', '#7c73b5', '#241f5b', '#f59e0b', '#ef4444']

type TooltipStyle = {
  backgroundColor: string
  border: string
  borderRadius: number
  color: string
}

export function ClientsSection({
  clientMonth,
  clientYear,
  clientYears,
  onClientMonth,
  onClientYear,
  filteredClientCount,
  committedTotal,
  statusSlices,
  clientMonths,
  displayCurrency,
  chartMuted,
  gridStroke,
  tooltipStyle,
  onStatusClick,
  onMonthClick,
}: {
  clientMonth: string
  clientYear: string
  clientYears: string[]
  onClientMonth: (value: string) => void
  onClientYear: (value: string) => void
  filteredClientCount: number
  committedTotal: number
  statusSlices: StatusSlice[]
  clientMonths: MonthBucket[]
  displayCurrency: string
  chartMuted: string
  gridStroke: string
  tooltipStyle: TooltipStyle
  onStatusClick: (status: string | null) => void
  onMonthClick: (monthKey: string | null) => void
}) {
  return (
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
          onMonth={onClientMonth}
          onYear={onClientYear}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Overall clients"
          subtitle="Distribution by status · hover for count and committed amount"
          actions={
            <div className="w-full max-w-[30rem] rounded-2xl border border-theme bg-theme-elevated/55 p-2">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-theme bg-theme-card px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted">
                    Total clients
                  </p>
                  <p className="mt-1 text-xl font-extrabold leading-none text-aqua">
                    {filteredClientCount}
                  </p>
                </div>
                <div className="rounded-xl border border-theme bg-theme-card px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted">
                    Committed amount
                  </p>
                  <p className="mt-1 text-sm font-bold text-theme-fg">
                    {formatMoney(committedTotal, displayCurrency)}
                  </p>
                </div>
                <div className="rounded-lg border border-theme bg-theme-card px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted">
                    Status split
                  </p>
                  {statusSlices.length === 0 ? (
                    <p className="mt-1 text-xs text-theme-muted">No statuses</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {statusSlices.map((slice) => (
                        <button
                          type="button"
                          key={slice.name}
                          onClick={() => onStatusClick(slice.name)}
                          className="rounded-full border border-theme px-1.5 py-0.5 text-[10px] font-medium text-theme-fg transition hover:border-aqua/50 hover:text-aqua"
                        >
                          {slice.name}: {slice.value}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                    isAnimationActive={false}
                    onClick={(entry, index) => {
                      const fromEntry =
                        typeof (entry as { name?: unknown } | undefined)?.name === 'string'
                          ? ((entry as { name?: string }).name ?? null)
                          : null
                      const fromIndex =
                        typeof index === 'number' ? statusSlices[index]?.name ?? null : null
                      onStatusClick(fromEntry || fromIndex)
                    }}
                  >
                    {statusSlices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name, item) => {
                      const amount = (item?.payload as { amount?: number })?.amount ?? 0
                      return [`${value} clients · ${formatMoney(amount, displayCurrency)}`, String(name)]
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
          subtitle="New clients by onboarding month (click a bar to view client details)"
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
                        return [`${value} · ${formatMoney(amount, displayCurrency)}`, 'Clients']
                      }
                      return [value, String(name)]
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="count"
                    fill="#1fcc9a"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                    onClick={(row) => onMonthClick((row as { key?: string } | undefined)?.key ?? null)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </section>
  )
}
