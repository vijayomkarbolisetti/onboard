'use client'

import { Download, FileSpreadsheet, FileText, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { OpenInvoiceFormModal } from '@/components/OpenInvoiceFormModal'
import { RowDetailsModal, type DetailField } from '@/components/RowDetailsModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { useTeamRole } from '@/hooks/useTeamRole'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
import {
  exportOpenInvoicesExcel,
  downloadOpenInvoiceTemplate,
  parseOpenInvoicesExcel,
} from '@/lib/openInvoiceExcel'
import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import { displayFieldValue, formatDate, formatCompanyNames, resolveInvoiceNumber } from '@/utils/format'

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

function companyNameCell(value: string | undefined): ReactNode {
  const text = formatCompanyNames(value)
  if (!text) return '—'
  return (
    <span className="block max-w-[220px] truncate" title={text}>
      {text}
    </span>
  )
}

function cellValue(
  invoice: OpenInvoice,
  column: (typeof columns)[number],
  index: number,
): ReactNode {
  switch (column) {
    case 'S.No':
      return index + 1
    case 'Invoice Date':
      return formatDate(invoice.invoiceDate)
    case 'Customer Name':
      return invoice.customerName || '—'
    case 'Company Name':
      return companyNameCell(invoice.companyName)
    case 'Invoice Number':
      return resolveInvoiceNumber(invoice as unknown as Record<string, unknown>) || '—'
    case 'Invoice Amount':
      return displayFieldValue(invoice.invoiceAmount)
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

function buildOpenInvoiceDetailFields(invoice: OpenInvoice, index: number): DetailField[] {
  return columns
    .filter((col) => col !== 'S.No')
    .map((col) => ({
      label: col,
      value:
        col === 'Company Name'
          ? formatCompanyNames(invoice.companyName) || '—'
          : col === 'Notes'
            ? invoice.notes || '—'
            : cellValue(invoice, col, index),
      fullWidth: col === 'Notes' || col === 'Company Name',
    }))
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
  const { canWrite } = useTeamRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OpenInvoice | null>(null)
  const [viewing, setViewing] = useState<OpenInvoice | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
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
      {canWrite ? (
        <button
          type="button"
          onClick={() => downloadOpenInvoiceTemplate()}
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
        onClick={() => exportOpenInvoicesExcel(invoices)}
        disabled={invoices.length === 0}
        title="Export Excel"
        aria-label="Export Excel"
        className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
      >
        <Download size={18} />
      </button>
      {canWrite ? (
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Add Open Invoice
        </button>
      ) : null}
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
      <table className="wyra-data-table w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
          <tr>
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col}
              </th>
            ))}
            {canWrite ? (
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr
              key={invoice.id}
              className="cursor-pointer transition hover:bg-theme-hover"
              onClick={() => {
                setViewing(invoice)
                setViewingIndex(index)
              }}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-4 py-3 text-theme-body ${
                    col === 'Company Name' || col === 'Notes'
                      ? 'max-w-[220px]'
                      : 'whitespace-nowrap'
                  }`}
                >
                  {cellValue(invoice, col, index)}
                </td>
              ))}
              {canWrite ? (
                <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                          resolveInvoiceNumber(invoice as unknown as Record<string, unknown>) ||
                            invoice.companyName ||
                            'this invoice',
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
              ) : null}
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

      <RowDetailsModal
        open={Boolean(viewing)}
        title={
          viewing
            ? resolveInvoiceNumber(viewing as unknown as Record<string, unknown>) ||
              viewing.companyName ||
              'Open invoice'
            : 'Open invoice'
        }
        subtitle="Open Invoices"
        fields={viewing ? buildOpenInvoiceDetailFields(viewing, viewingIndex) : []}
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
