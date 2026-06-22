'use client'

import { Download, Pencil, Plus, Trash2, Upload, Wallet } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ExpenseFormModal } from '@/components/ExpenseFormModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { EXPENSE_TABLE_COLUMNS, exportExpensesExcel, parseExpensesExcel } from '@/lib/expenseExcel'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
import type { CreateExpenseInput, Expense } from '@/types'
import { formatDate } from '@/utils/format'

interface ExpensesProps {
  expenses: Expense[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateExpenseInput) => Promise<void>
  onUpdate: (id: string, input: CreateExpenseInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (inputs: CreateExpenseInput[]) => Promise<void>
}

function formatExpenseAmount(amount: number) {
  if (!Number.isFinite(amount)) return '—'
  if (Number.isInteger(amount)) {
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

export function Expenses({
  expenses,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: ExpensesProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [importing, setImporting] = useState(false)
  const [toolNameFilter, setToolNameFilter] = useState('')
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

  const filteredExpenses = useMemo(() => {
    if (!toolNameFilter) return expenses
    return expenses.filter((expense) => expense.toolName === toolNameFilter)
  }, [expenses, toolNameFilter])

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
        <select
          id="expense-tool-filter"
          className="wyra-input py-2"
          value={toolNameFilter}
          onChange={(event) => setToolNameFilter(event.target.value)}
        >
          <option value="">All tools</option>
          {toolNameOptions.map((toolName) => (
            <option key={toolName} value={toolName}>
              {toolName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
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
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Add Expense
        </button>
      </div>
    </div>
  )

  const tablePanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
    </div>
  ) : expenses.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
        <Wallet className="mx-auto text-theme-muted" size={40} />
        <h3 className="mt-4 text-lg font-semibold text-theme-fg">No expenses yet</h3>
        <p className="mt-2 text-sm text-theme-muted">
          Add records manually or import an Excel file (.xlsx, .xls)
        </p>
      </div>
    </div>
  ) : filteredExpenses.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
        <Wallet className="mx-auto text-theme-muted" size={40} />
        <h3 className="mt-4 text-lg font-semibold text-theme-fg">No matching expenses</h3>
        <p className="mt-2 text-sm text-theme-muted">Try a different Tool Name filter</p>
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="wyra-data-table w-full min-w-[900px] text-left text-sm">
        <thead className="bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
          <tr>
            {EXPENSE_TABLE_COLUMNS.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense, index) => (
            <tr key={expense.id} className="transition hover:bg-theme-hover">
              {EXPENSE_TABLE_COLUMNS.map((col) => (
                <td key={col} className="whitespace-nowrap px-4 py-3 text-theme-body">
                  {cellValue(expense, col, index)}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3">
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
            </tr>
          ))}
        </tbody>
      </table>
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
    </div>
  )
}
