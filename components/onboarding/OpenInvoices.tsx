'use client'

import { Download, FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { OpenInvoiceFormModal } from '@/components/OpenInvoiceFormModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
import {
  exportOpenInvoicesExcel,
  parseOpenInvoicesExcel,
} from '@/lib/openInvoiceExcel'
import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

interface OpenInvoicesProps {
  invoices: OpenInvoice[]
  loading: boolean
  error: string | null
  companyNames: string[]
  onCreate: (input: CreateOpenInvoiceInput) => Promise<void>
  onUpdate: (id: string, input: CreateOpenInvoiceInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (inputs: CreateOpenInvoiceInput[]) => Promise<void>
}

const columns = [
  'S.No',
  'Invoice Date',
  'Customer Name',
  'Company Name',
  'Invoice Number',
  'Invoice Amount',
  'Status',
  'Notes',
] as const

function cellValue(invoice: OpenInvoice, column: (typeof columns)[number], index: number) {
  switch (column) {
    case 'S.No':
      return index + 1
    case 'Invoice Date':
      return formatDate(invoice.invoiceDate)
    case 'Customer Name':
      return invoice.customerName || '—'
    case 'Company Name':
      return invoice.companyName || '—'
    case 'Invoice Number':
      return invoice.invoiceNumber || '—'
    case 'Invoice Amount':
      return formatCurrency(invoice.invoiceAmount)
    case 'Status':
      return invoice.status || '—'
    case 'Notes':
      return (
        <span className="block max-w-[200px] truncate" title={invoice.notes}>
          {invoice.notes || '—'}
        </span>
      )
    default:
      return '—'
  }
}

export function OpenInvoices({
  invoices,
  loading,
  companyNames,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: OpenInvoicesProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OpenInvoice | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDeleteConfirm, deleteModal } = useDeleteConfirm({
    onConfirm: onDelete,
    successMessage: 'Open invoice deleted',
    errorMessage: 'Failed to delete open invoice',
  })

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
      const { records, importedCount } = await parseOpenInvoicesExcel(file)
      await onImport(records)
      notify.success(`Imported ${importedCount} record(s) successfully.`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to import Excel file')
    } finally {
      setImporting(false)
    }
  }

  const actionToolbar = (
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
        onClick={() => exportOpenInvoicesExcel(invoices)}
        disabled={invoices.length === 0}
        title="Export Excel"
        aria-label="Export Excel"
        className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
      >
        <Download size={18} />
      </button>
      <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
        <Plus size={16} />
        Add Open Invoice
      </button>
    </div>
  )

  const tablePanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
    </div>
  ) : invoices.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
        <FileText className="mx-auto text-theme-muted" size={40} />
        <h3 className="mt-4 text-lg font-semibold text-theme-fg">No open invoices yet</h3>
        <p className="mt-2 text-sm text-theme-muted">
          Add records manually or import an Excel file (.xlsx, .xls)
        </p>
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-theme bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
          <tr>
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-theme">
          {invoices.map((invoice, index) => (
            <tr key={invoice.id} className="transition hover:bg-theme-hover">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-4 py-3 text-theme-body">
                  {cellValue(invoice, col, index)}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(invoice)}
                    className="rounded-lg p-2 text-theme-muted hover:bg-aqua/10 hover:text-aqua"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openDeleteConfirm(
                        invoice.id,
                        invoice.invoiceNumber || invoice.companyName || 'this invoice',
                        { title: 'Delete open invoice?' },
                      )
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

      <OpenInvoiceFormModal
        open={createOpen}
        mode="create"
        companyNames={companyNames}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <OpenInvoiceFormModal
        open={!!editing}
        mode="edit"
        initial={editing}
        companyNames={companyNames}
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
