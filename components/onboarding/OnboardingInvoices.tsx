'use client'

import { ClipboardList, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { OnboardingInvoiceFormModal } from '@/components/OnboardingInvoiceFormModal'
import {
  exportOnboardingInvoicesExcel,
  parseOnboardingInvoicesExcel,
} from '@/lib/onboardingInvoiceExcel'
import { isExcelFile } from '@/lib/excelUtils'
import { cn } from '@/lib/utils'
import type { CreateOnboardingInvoiceInput, OnboardingInvoiceRecord } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

interface OnboardingInvoicesProps {
  records: OnboardingInvoiceRecord[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateOnboardingInvoiceInput) => Promise<void>
  onUpdate: (id: string, input: CreateOnboardingInvoiceInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (inputs: CreateOnboardingInvoiceInput[]) => Promise<void>
}

const columns: { key: keyof OnboardingInvoiceRecord | 'actions'; label: string }[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'saasMspAgreement', label: 'Saas / MSP Agreement' },
  { key: 'sponsor', label: 'Sponsor' },
  { key: 'partnerProgram', label: 'Partner Program' },
  { key: 'pointOfContact', label: 'Point Of Contact' },
  { key: 'personEmailId', label: 'Person Email Id' },
  { key: 'onBoardDate', label: 'On Board Date' },
  { key: 'invoiceAmount', label: 'Invoice Amount' },
  { key: 'firstInvoiceDate', label: '1st Invoice Date' },
  { key: 'invoiceCycle', label: 'Invoice Cycle' },
  { key: 'invoicesGenerated', label: 'No. Invoices Generated' },
  { key: 'invoicesPaid', label: 'No. Invoices Paid' },
  { key: 'nextInvoiceStatus', label: 'Next Invoice Status' },
  { key: 'actions', label: 'Actions' },
]

function cellValue(record: OnboardingInvoiceRecord, key: keyof OnboardingInvoiceRecord) {
  const val = record[key]
  if (key === 'onBoardDate' || key === 'firstInvoiceDate') {
    return formatDate(String(val))
  }
  if (key === 'invoiceAmount') {
    return formatCurrency(Number(val))
  }
  return val === 0 ? '0' : String(val || '—')
}

export function OnboardingInvoices({
  records,
  loading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: OnboardingInvoicesProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OnboardingInvoiceRecord | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    exportOnboardingInvoicesExcel(records)
  }

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
      const { records: importedRecords, importedCount } =
        await parseOnboardingInvoicesExcel(file)
      await onImport(importedRecords)
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
            onClick={handleExport}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-theme px-4 py-2.5 text-sm font-semibold text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>

        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Add Record
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

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

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
          <ClipboardList className="mx-auto text-theme-muted" size={40} />
          <h3 className="mt-4 text-lg font-semibold text-theme-fg">No records yet</h3>
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
              Add Record
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-theme">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="border-b border-theme bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {records.map((record) => (
                  <tr key={record.id} className="transition hover:bg-theme-hover">
                    {columns.map((col) => {
                      if (col.key === 'actions') {
                        return (
                          <td key={col.key} className="whitespace-nowrap px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setEditing(record)}
                                className="rounded-lg p-2 text-theme-muted hover:bg-aqua/10 hover:text-aqua"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDelete(record.id)}
                                className="rounded-lg p-2 text-theme-muted hover:bg-red-500/10 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'whitespace-nowrap px-4 py-3',
                            col.key === 'companyName'
                              ? 'font-semibold text-theme-fg'
                              : 'text-theme-body',
                          )}
                        >
                          {cellValue(record, col.key as keyof OnboardingInvoiceRecord)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OnboardingInvoiceFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <OnboardingInvoiceFormModal
        open={Boolean(editing)}
        mode="edit"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing) await onUpdate(editing.id, input)
        }}
      />
    </div>
  )
}
