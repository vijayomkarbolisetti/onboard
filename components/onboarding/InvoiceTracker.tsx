'use client'

import { AlertCircle, CheckCircle2, Clock, Plus, Receipt } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CreateInvoiceModal } from '@/components/CreateInvoiceModal'
import { cn } from '@/lib/utils'
import type { CreateInvoiceInput, Invoice, Onboarding } from '@/types'
import { formatCurrency, formatDate, invoiceStatusClass } from '@/utils/format'

interface InvoiceTrackerProps {
  invoices: Invoice[]
  onboardings: Onboarding[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateInvoiceInput) => Promise<void>
  onStatusChange: (id: string, status: Invoice['status']) => Promise<void>
}

export function InvoiceTracker({
  invoices,
  onboardings,
  loading,
  error,
  onCreate,
  onStatusChange,
}: InvoiceTrackerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, item) => sum + item.amount, 0)
    const paid = invoices
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + item.amount, 0)
    const pending = invoices.filter((item) => item.status === 'pending').length
    const overdue = invoices.filter((item) => item.status === 'overdue').length

    return { total, paid, pending, overdue }
  }, [invoices])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={onboardings.length === 0}
          className="btn-wyra disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Create Invoice
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Invoiced"
          value={formatCurrency(stats.total)}
          icon={<Receipt className="text-wyra-blue" size={20} />}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(stats.paid)}
          icon={<CheckCircle2 className="text-aqua" size={20} />}
        />
        <StatCard
          label="Pending"
          value={String(stats.pending)}
          icon={<Clock className="text-lime" size={20} />}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          icon={<AlertCircle className="text-red-400" size={20} />}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
          <Receipt className="mx-auto text-theme-muted" size={40} />
          <h3 className="mt-4 text-lg font-semibold text-theme-fg">No invoices yet</h3>
          <p className="mt-2 text-sm text-theme-muted">
            Create an onboarding first, then add invoices
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-theme">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-theme bg-theme-hover text-xs uppercase tracking-wider text-theme-muted">
                <tr>
                  <th className="px-5 py-4 font-semibold">Invoice</th>
                  <th className="px-5 py-4 font-semibold">Organization</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Due Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((item) => (
                  <tr key={item.id} className="transition hover:bg-theme-hover">
                    <td className="px-5 py-4 font-semibold text-theme-fg">
                      {item.invoiceNumber}
                    </td>
                    <td className="px-5 py-4 text-theme-muted">{item.organization}</td>
                    <td className="px-5 py-4 font-semibold text-aqua">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-5 py-4 text-theme-muted">{formatDate(item.dueDate)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                          invoiceStatusClass(item.status),
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(['pending', 'paid', 'overdue'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void onStatusChange(item.id, status)}
                            className={cn(
                              'rounded-md px-2 py-1 text-xs capitalize transition',
                              item.status === status
                                ? 'btn-wyra-nav px-2 py-1 text-xs font-bold'
                                : 'border border-theme-strong text-theme-muted hover:text-theme-fg',
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onboardings={onboardings}
        onSubmit={onCreate}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="glass-panel p-5 transition hover:border-aqua/20">
      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-theme-fg">{value}</p>
    </div>
  )
}
