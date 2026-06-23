'use client'

import { ClipboardList, Download, ExternalLink, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { OnboardingInvoiceFormModal } from '@/components/OnboardingInvoiceFormModal'
import { RowDetailsModal, type DetailField } from '@/components/RowDetailsModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { useTeamRole } from '@/hooks/useTeamRole'
import {
  exportOnboardingInvoicesExcel,
  downloadOnboardingInvoiceTemplate,
  parseOnboardingInvoicesExcel,
} from '@/lib/onboardingInvoiceExcel'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
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

const columns: { key: keyof OnboardingInvoiceRecord | 'actions' | 'sNo'; label: string }[] = [
  { key: 'sNo', label: 'S.No' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'subscriptionSummary', label: 'Subscription Summary' },
  { key: 'agreementDocumentLink', label: 'Agreement Document Link' },
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
  { key: 'totalAmountPaid', label: 'Total Amount Paid' },
  { key: 'pendingAmount', label: 'Pending Amount' },
  { key: 'nextInvoiceStatus', label: 'Next Invoice Status' },
  { key: 'actions', label: 'Actions' },
]

function agreementLinkLabel(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./i, '')
  } catch {
    return 'View document'
  }
}

function agreementLinkCell(url: string | undefined) {
  const trimmed = url?.trim()
  if (!trimmed) return '—'

  const label = agreementLinkLabel(trimmed)

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      title={trimmed}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-lg border border-aqua/30 bg-aqua/10 px-2.5 py-1 text-xs font-semibold text-aqua transition hover:border-aqua/50 hover:bg-aqua/15"
    >
      <ExternalLink size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  )
}

function agreementLinkDetail(url: string | undefined) {
  const trimmed = url?.trim()
  if (!trimmed) return '—'

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-start gap-1.5 break-all text-aqua hover:underline"
    >
      <ExternalLink size={14} className="mt-0.5 shrink-0" />
      <span>{trimmed}</span>
    </a>
  )
}

function subscriptionSummaryDetail(text: string | undefined) {
  const trimmed = text?.trim()
  if (!trimmed) return '—'
  return <span className="whitespace-pre-wrap break-words">{trimmed}</span>
}

function cellValue(
  record: OnboardingInvoiceRecord,
  key: keyof OnboardingInvoiceRecord | 'sNo',
  index: number,
): ReactNode {
  if (key === 'sNo') return index + 1

  const val = record[key]
  if (key === 'onBoardDate' || key === 'firstInvoiceDate') {
    return formatDate(String(val))
  }
  if (key === 'invoiceAmount' || key === 'totalAmountPaid' || key === 'pendingAmount') {
    return formatCurrency(Number(val))
  }
  if (key === 'agreementDocumentLink') {
    return agreementLinkCell(typeof val === 'string' ? val : undefined)
  }
  if (key === 'subscriptionSummary') {
    const text = String(val ?? '').trim()
    if (!text) return '—'
    return (
      <span className="block max-w-[220px] truncate" title={text}>
        {text}
      </span>
    )
  }
  return val === 0 ? '0' : String(val || '—')
}

function isDetailColumn(
  col: { key: keyof OnboardingInvoiceRecord | 'actions' | 'sNo'; label: string },
): col is { key: keyof OnboardingInvoiceRecord; label: string } {
  return col.key !== 'actions' && col.key !== 'sNo'
}

function buildOnboardingInvoiceDetailFields(
  record: OnboardingInvoiceRecord,
  index: number,
): DetailField[] {
  return columns
    .filter(isDetailColumn)
    .map((col) => ({
      label: col.label,
      value:
        col.key === 'agreementDocumentLink'
          ? agreementLinkDetail(record.agreementDocumentLink)
          : col.key === 'subscriptionSummary'
            ? subscriptionSummaryDetail(record.subscriptionSummary)
            : cellValue(record, col.key, index),
      fullWidth:
        col.key === 'subscriptionSummary' || col.key === 'agreementDocumentLink',
    }))
}

export function OnboardingInvoices({
  records,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: OnboardingInvoicesProps) {
  const { canWrite } = useTeamRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OnboardingInvoiceRecord | null>(null)
  const [viewing, setViewing] = useState<OnboardingInvoiceRecord | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDeleteConfirm, deleteModal } = useDeleteConfirm({
    onConfirm: onDelete,
    successMessage: 'Record deleted',
    errorMessage: 'Failed to delete record',
  })

  const handleExport = () => {
    exportOnboardingInvoicesExcel(records)
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
      const { records: importedRecords, importedCount } =
        await parseOnboardingInvoicesExcel(file)
      await onImport(importedRecords)
      notify.success(`Imported ${importedCount} record(s) successfully.`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to import Excel file')
    } finally {
      setImporting(false)
    }
  }

  const visibleColumns = canWrite
    ? columns
    : columns.filter((col) => col.key !== 'actions')

  const actionToolbar = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canWrite ? (
        <button
          type="button"
          onClick={() => downloadOnboardingInvoiceTemplate()}
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
        onClick={handleExport}
        disabled={records.length === 0}
        title="Export Excel"
        aria-label="Export Excel"
        className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
      >
        <Download size={18} />
      </button>
      {canWrite ? (
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Add Record
        </button>
      ) : null}
    </div>
  )

  const tablePanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
    </div>
  ) : records.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
        <ClipboardList className="mx-auto text-theme-muted" size={40} />
        <h3 className="mt-4 text-lg font-semibold text-theme-fg">No records yet</h3>
        <p className="mt-2 text-sm text-theme-muted">
          Add records manually or import an Excel file (.xlsx, .xls)
        </p>
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="wyra-data-table w-full min-w-[1800px] text-left text-sm">
        <thead className="bg-theme-elevated text-xs uppercase tracking-wider text-theme-muted">
          <tr>
            {visibleColumns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              key={record.id}
              className="cursor-pointer transition hover:bg-theme-hover"
              onClick={() => {
                setViewing(record)
                setViewingIndex(index)
              }}
            >
              {visibleColumns.map((col) => {
                if (col.key === 'actions') {
                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          onClick={() =>
                            openDeleteConfirm(record.id, record.companyName || 'this record', {
                              title: 'Delete onboarding record?',
                            })
                          }
                          className="rounded-lg p-2 text-theme-muted hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )
                }

                const columnKey = col.key
                return (
                  <td
                    key={columnKey}
                    className={cn(
                      'px-4 py-3',
                      columnKey === 'subscriptionSummary' || columnKey === 'agreementDocumentLink'
                        ? 'max-w-[220px]'
                        : 'whitespace-nowrap',
                      columnKey === 'companyName'
                        ? 'font-semibold text-theme-fg'
                        : 'text-theme-body',
                    )}
                  >
                    {cellValue(record, columnKey, index)}
                  </td>
                )
              })}
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

      {deleteModal}

      <RowDetailsModal
        open={Boolean(viewing)}
        title={viewing?.companyName || 'Onboarding record'}
        subtitle="Onboarding & Invoices"
        fields={viewing ? buildOnboardingInvoiceDetailFields(viewing, viewingIndex) : []}
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
