'use client'

import { Download, FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { OpenInvoiceFormModal } from '@/components/OpenInvoiceFormModal'
import { isExcelFile } from '@/lib/excelUtils'
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
  error,
  companyNames,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: OpenInvoicesProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OpenInvoice | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    setImportMessage(null)
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!isExcelFile(file)) {
      setImportError('Only Excel files (.xlsx, .xls) are supported')
      return
    }

    setImporting(true)
    setImportMessage(null)
    setImportError(null)

    try {
      const { records, importedCount } = await parseOpenInvoicesExcel(file)
      await onImport(records)
      setImportMessage(`Imported ${importedCount} record(s) successfully.`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import Excel file')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-theme pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl border border-theme px-4 py-2.5 text-sm font-semibold text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
          >
            <Upload size={16} />
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <button
            type="button"
            onClick={() => exportOpenInvoicesExcel(invoices)}
            disabled={invoices.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-theme px-4 py-2.5 text-sm font-semibold text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Add Open Invoice
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      {importMessage && (
        <div className="rounded-xl border border-aqua/30 bg-aqua/10 px-4 py-3 text-sm text-aqua">
          {importMessage}
        </div>
      )}

      {importError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {importError}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
          <FileText className="mx-auto text-theme-muted" size={40} />
          <h3 className="mt-4 text-lg font-semibold text-theme-fg">No open invoices yet</h3>
          <p className="mt-2 text-sm text-theme-muted">
            Add records manually or import an Excel file (.xlsx, .xls)
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={handleImportClick} className="btn-wyra">
              <Upload size={16} />
              Import Excel
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
              <Plus size={16} />
              Add Open Invoice
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-theme">
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
                          onClick={() => void onDelete(invoice.id)}
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
        </div>
      )}

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
    </div>
  )
}
