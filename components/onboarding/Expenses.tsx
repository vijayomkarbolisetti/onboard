'use client'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExpenseFormModal } from '@/components/ExpenseFormModal'
import { WyraSelect } from '@/components/CompanyNameSelect'
import { RowDetailsModal, type DetailField } from '@/components/RowDetailsModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { useTeamRole } from '@/hooks/useTeamRole'
import {
  EXPENSE_TABLE_COLUMNS,
  exportExpensesExcel,
  downloadExpenseTemplate,
  parseExpensesExcel,
} from '@/lib/expenseExcel'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
import type { CreateExpenseInput, Expense } from '@/types'
import { displayFieldValue, formatDate } from '@/utils/format'
import { DocumentLinks } from '@/components/DocumentField'

const PAGE_SIZE = 20

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Parse YYYY-MM-DD directly — avoids UTC-to-local timezone shift from new Date()
function parseDateParts(dateStr: string): { year: string; month: string } | null {
  if (!dateStr) return null
  const match = dateStr.match(/^(\d{4})-(\d{2})/)
  if (match) return { year: match[1], month: match[2] }
  return null
}

interface ExpensesProps {
  expenses: Expense[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateExpenseInput) => Promise<void>
  onUpdate: (id: string, input: CreateExpenseInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (inputs: CreateExpenseInput[]) => Promise<void>
}

function formatExpenseAmount(amount: string | number) {
  return displayFieldValue(amount)
}

function cellValue(
  expense: Expense,
  column: (typeof EXPENSE_TABLE_COLUMNS)[number],
  index: number,
) {
  switch (column) {
    case 'NO':
      return index + 1
    case 'Tool Name':
      return expense.toolName || '—'
    case 'Invoice Date':
      return formatDate(expense.invoiceDate)
    case 'Card Used':
      return expense.cardUsed || '—'
    case 'Card Owner':
      return expense.cardOwner || '—'
    case 'Amount':
      return formatExpenseAmount(expense.amount)
    case 'Currency':
      return expense.currency || '—'
    default:
      return '—'
  }
}

function buildExpenseDetailFields(expense: Expense, index: number): DetailField[] {
  return [
    ...EXPENSE_TABLE_COLUMNS.map((col) => ({
      label: col,
      value: cellValue(expense, col, index),
    })),
    {
      label: 'Documents',
      value: <DocumentLinks documents={expense.documents} />,
      fullWidth: true,
    },
  ]
}

/* ── Invoice Date column-header filter popover ── */
interface DateFilterPopoverProps {
  monthFilter: string
  yearFilter: string
  availableYears: string[]
  onMonthChange: (v: string) => void
  onYearChange: (v: string) => void
  onClear: () => void
  isActive: boolean
}

function DateFilterPopover({
  monthFilter,
  yearFilter,
  availableYears,
  onMonthChange,
  onYearChange,
  onClear,
  isActive,
}: DateFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('.wyra-dropdown-panel')) {
        return
      }
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filter by date"
        className={`ml-1 rounded p-0.5 transition ${
          isActive
            ? 'text-aqua'
            : 'text-theme-muted hover:text-theme-fg'
        }`}
      >
        <Filter size={12} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-theme bg-theme-modal p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-theme-muted">
              Filter by Date
            </span>
            {isActive && (
              <button
                type="button"
                onClick={() => { onClear(); setOpen(false) }}
                className="flex items-center gap-1 text-xs text-aqua hover:underline"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-theme-muted">Month</label>
              <WyraSelect
                value={monthFilter}
                onChange={onMonthChange}
                placeholder="All months"
                options={MONTH_NAMES.map((name, i) => ({
                  value: String(i + 1).padStart(2, '0'),
                  label: name,
                }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-theme-muted">Year</label>
              <WyraSelect
                value={yearFilter}
                onChange={onYearChange}
                placeholder="All years"
                options={availableYears.map((y) => ({ value: y, label: y }))}
              />
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

export function Expenses({
  expenses,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: ExpensesProps) {
  const { canWrite } = useTeamRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [viewing, setViewing] = useState<Expense | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [importing, setImporting] = useState(false)
  const [toolNameFilter, setToolNameFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDeleteConfirm, deleteModal } = useDeleteConfirm({
    onConfirm: onDelete,
    successMessage: 'Expense deleted',
    errorMessage: 'Failed to delete expense',
  })

  const toolNameOptions = useMemo(
    () =>
      Array.from(
        new Set(expenses.map((expense) => expense.toolName.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [expenses],
  )

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    for (const e of expenses) {
      const parts = parseDateParts(e.invoiceDate)
      if (parts) years.add(parts.year)
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (toolNameFilter && expense.toolName !== toolNameFilter) return false
      if (monthFilter || yearFilter) {
        const parts = parseDateParts(expense.invoiceDate)
        if (!parts) return false
        if (monthFilter && parts.month !== monthFilter) return false
        if (yearFilter && parts.year !== yearFilter) return false
      }
      return true
    })
  }, [expenses, toolNameFilter, monthFilter, yearFilter])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedExpenses = filteredExpenses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const dateFilterActive = Boolean(monthFilter || yearFilter)

  const handleDateFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  const clearDateFilter = () => {
    setMonthFilter('')
    setYearFilter('')
    setPage(1)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!isExcelFile(file)) {
      notify.error('Only Excel files (.xlsx, .xls) are supported')
      return
    }

    setImporting(true)

    try {
      const { records, importedCount } = await parseExpensesExcel(file)
      if (records.length === 0) {
        notify.error('No valid rows found in the Excel file')
        return
      }

      await onImport(records)

      const missingDates = records.filter((record) => !record.invoiceDate).length
      if (missingDates > 0) {
        notify.success(
          `Imported ${importedCount} record(s). ${missingDates} row(s) had unparseable dates.`,
        )
      } else {
        notify.success(`Imported ${importedCount} record(s) successfully.`)
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to import Excel file')
    } finally {
      setImporting(false)
    }
  }

  const actionToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-xs">
        <label htmlFor="expense-tool-filter" className="shrink-0 text-sm font-semibold text-theme-label">
          Tool Name
        </label>
        <WyraSelect
          id="expense-tool-filter"
          className="min-w-0 flex-1"
          value={toolNameFilter}
          onChange={(v) => { setToolNameFilter(v); setPage(1) }}
          placeholder="All tools"
          options={toolNameOptions.map((toolName) => ({
            value: toolName,
            label: toolName,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {canWrite ? (
          <button
            type="button"
            onClick={() => downloadExpenseTemplate()}
            title="Download sample Excel"
            aria-label="Download sample Excel"
            className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover"
          >
            <FileSpreadsheet size={18} />
          </button>
        ) : null}
        {canWrite ? (
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            title={importing ? 'Importing...' : 'Import Excel'}
            aria-label="Import Excel"
            className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
          >
            <Upload size={18} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => exportExpensesExcel(filteredExpenses)}
          disabled={filteredExpenses.length === 0}
          title="Export Excel"
          aria-label="Export Excel"
          className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
        >
          <Download size={18} />
        </button>
        {canWrite ? (
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
            <Plus size={16} />
            Add Expense
          </button>
        ) : null}
      </div>
    </div>
  )

  const emptyMessage =
    expenses.length === 0
      ? {
          title: 'No expenses yet',
          description: 'Add records manually or import an Excel file (.xlsx, .xls)',
        }
      : {
          title: 'No matching expenses',
          description: 'Try adjusting the filters',
        }

  const tablePanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="wyra-data-table w-full min-w-[900px] text-left text-sm">
        <thead className="bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
          <tr>
            {EXPENSE_TABLE_COLUMNS.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col === 'Invoice Date' ? (
                  <span className="inline-flex items-center gap-0.5">
                    Invoice Date
                    <DateFilterPopover
                      monthFilter={monthFilter}
                      yearFilter={yearFilter}
                      availableYears={availableYears}
                      onMonthChange={handleDateFilterChange(setMonthFilter)}
                      onYearChange={handleDateFilterChange(setYearFilter)}
                      onClear={clearDateFilter}
                      isActive={dateFilterActive}
                    />
                  </span>
                ) : (
                  col
                )}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Documents</th>
            {canWrite ? (
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr>
              <td
                colSpan={EXPENSE_TABLE_COLUMNS.length + 1 + (canWrite ? 1 : 0)}
                className="px-6 py-16"
              >
                <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
                  <Wallet className="mx-auto text-theme-muted" size={40} />
                  <h3 className="mt-4 text-lg font-semibold text-theme-fg">{emptyMessage.title}</h3>
                  <p className="mt-2 text-sm text-theme-muted">{emptyMessage.description}</p>
                </div>
              </td>
            </tr>
          ) : (
            pagedExpenses.map((expense, pageIndex) => {
              const globalIndex = (safePage - 1) * PAGE_SIZE + pageIndex
              return (
                <tr
                  key={expense.id}
                  className="cursor-pointer transition hover:bg-theme-hover"
                  onClick={() => {
                    setViewing(expense)
                    setViewingIndex(globalIndex)
                  }}
                >
                  {EXPENSE_TABLE_COLUMNS.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-3 text-theme-body">
                      {cellValue(expense, col, globalIndex)}
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-theme-body"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DocumentLinks documents={expense.documents} />
                  </td>
                  {canWrite ? (
                    <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(expense)}
                          className="rounded-lg p-2 text-theme-muted hover:bg-aqua/10 hover:text-aqua"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openDeleteConfirm(expense.id, expense.toolName || 'this expense', {
                              title: 'Delete expense?',
                            })
                          }
                          className="rounded-lg p-2 text-theme-muted hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-theme px-4 py-3">
        <p className="text-sm text-theme-muted">
          {filteredExpenses.length === 0
            ? 'No results'
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredExpenses.length)} of ${filteredExpenses.length}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center justify-center rounded-lg border border-theme p-1.5 text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-sm text-theme-muted">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`min-w-8 rounded-lg border px-2 py-1 text-sm font-medium transition ${
                      safePage === p
                        ? 'border-aqua bg-aqua/10 text-aqua'
                        : 'border-theme text-theme-muted hover:bg-theme-hover hover:text-theme-fg'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex items-center justify-center rounded-lg border border-theme p-1.5 text-theme-muted transition hover:bg-theme-hover hover:text-theme-fg disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {actionToolbar}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="content-shell overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
        {tablePanel}
      </div>

      <ExpenseFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <ExpenseFormModal
        open={!!editing}
        mode="edit"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) return
          await onUpdate(editing.id, input)
        }}
      />

      {deleteModal}

      <RowDetailsModal
        open={Boolean(viewing)}
        title={viewing?.toolName || 'Expense'}
        subtitle="Expenses"
        fields={viewing ? buildExpenseDetailFields(viewing, viewingIndex) : []}
        onClose={() => setViewing(null)}
        onEdit={
          canWrite && viewing
            ? () => {
                setEditing(viewing)
                setViewing(null)
              }
            : undefined
        }
      />
    </div>
  )
}
