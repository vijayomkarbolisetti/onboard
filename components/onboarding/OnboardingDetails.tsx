'use client'

import { Building2, Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { OnboardingFormModal } from '@/components/OnboardingFormModal'
import { RowDetailsModal, type DetailField } from '@/components/RowDetailsModal'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { useTeamRole } from '@/hooks/useTeamRole'
import { isExcelFile } from '@/lib/excelUtils'
import { notify } from '@/lib/toast'
import {
  exportOnboardingsExcel,
  downloadOnboardingTemplate,
  parseOnboardingsExcel,
} from '@/lib/onboardingExcel'
import type { CreateOnboardingInput, Onboarding } from '@/types'
import {
  formatDate,
  onboardingStatusClass,
  onboardingStatusLabel,
} from '@/utils/format'
import { cn } from '@/lib/utils'

interface OnboardingDetailsProps {
  onboardings: Onboarding[]
  loading: boolean
  error: string | null
  onCreate: (input: CreateOnboardingInput) => Promise<void>
  onUpdate: (id: string, input: CreateOnboardingInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport: (inputs: CreateOnboardingInput[]) => Promise<void>
}

const columns = [
  'S.No',
  'Organization',
  'Committed Months',
  'Agreement Signed Date',
  'No.of AI SDRs',
  'Onboarding Date',
  'End Date',
  'Comitted Amount',
  'Paid Amount',
  '1st campaign Launch date',
  'no.of campaigns',
  'Targeted Leads',
  'Contacted Leads',
  'Interested Leads',
  'Total Replies',
  'Status',
  'Remark',
] as const

function displayText(value: string | number | undefined | null) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function cellValue(
  item: Onboarding,
  column: (typeof columns)[number],
  index: number,
) {
  switch (column) {
    case 'S.No':
      return index + 1
    case 'Organization':
      return item.organization || '—'
    case 'Committed Months':
      return displayText(item.committedMonths)
    case 'Agreement Signed Date':
      return formatDate(item.agreementSignedDate ?? '')
    case 'No.of AI SDRs':
      return displayText(item.noOfAiSdrs)
    case 'Onboarding Date':
      return formatDate(item.onboardingDate)
    case 'End Date':
      return formatDate(item.endDate)
    case 'Comitted Amount':
      return displayText(item.committedAmount)
    case 'Paid Amount':
      return displayText(item.paidAmount)
    case '1st campaign Launch date':
      return formatDate(item.campaignLaunchDate)
    case 'no.of campaigns':
      return displayText(item.noOfCampaigns)
    case 'Targeted Leads':
      return displayText(item.targetedLeads)
    case 'Contacted Leads':
      return displayText(item.contactedLeads)
    case 'Interested Leads':
      return displayText(item.interestedLeads)
    case 'Total Replies':
      return displayText(item.totalReplies)
    case 'Status':
      return item.status ? (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
            onboardingStatusClass(item.status),
          )}
        >
          {onboardingStatusLabel(item.status)}
        </span>
      ) : (
        '—'
      )
    case 'Remark':
      return (
        <span className="block max-w-[200px] truncate" title={item.remark}>
          {item.remark || '—'}
        </span>
      )
    default:
      return '—'
  }
}

function remarkDetail(text: string | undefined) {
  const trimmed = text?.trim()
  if (!trimmed) return '—'
  return <span className="whitespace-pre-wrap break-words">{trimmed}</span>
}

function buildOnboardingDetailFields(item: Onboarding, index: number): DetailField[] {
  return columns
    .filter((col) => col !== 'S.No')
    .map((col) => ({
      label: col,
      value: col === 'Remark' ? remarkDetail(item.remark) : cellValue(item, col, index),
      fullWidth: col === 'Remark',
    }))
}

export function OnboardingDetails({
  onboardings,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
}: OnboardingDetailsProps) {
  const { canWrite } = useTeamRole()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Onboarding | null>(null)
  const [viewing, setViewing] = useState<Onboarding | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDeleteConfirm, deleteModal } = useDeleteConfirm({
    onConfirm: onDelete,
    successMessage: 'Client tracker deleted',
    errorMessage: 'Failed to delete client tracker',
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
      const { records, importedCount } = await parseOnboardingsExcel(file)
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
          onClick={() => downloadOnboardingTemplate()}
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
        onClick={() => exportOnboardingsExcel(onboardings)}
        disabled={onboardings.length === 0}
        title="Export Excel"
        aria-label="Export Excel"
        className="inline-flex items-center justify-center rounded-xl border border-theme p-2.5 text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
      >
        <Download size={18} />
      </button>
      {canWrite ? (
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-wyra">
          <Plus size={16} />
          Create Client Tracker
        </button>
      ) : null}
    </div>
  )

  const tablePanel = loading ? (
    <div className="p-5 sm:p-7">
      <div className="h-64 animate-pulse rounded-2xl border border-theme bg-theme-hover" />
    </div>
  ) : onboardings.length === 0 ? (
    <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-dashed border-theme-strong px-6 py-16 text-center">
        <Building2 className="mx-auto text-theme-muted" size={40} />
        <h3 className="mt-4 text-lg font-semibold text-theme-fg">No campaigns yet</h3>
        <p className="mt-2 text-sm text-theme-muted">
          Create your first client tracker or import an Excel file (.xlsx, .xls)
        </p>
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="wyra-data-table w-full min-w-[1600px] text-left text-sm">
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
          {onboardings.map((item, index) => (
            <tr
              key={item.id}
              className="cursor-pointer transition hover:bg-theme-hover"
              onClick={() => {
                setViewing(item)
                setViewingIndex(index)
              }}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className={cn(
                    'whitespace-nowrap px-4 py-3',
                    col === 'Organization' ? 'font-semibold text-theme-fg' : 'text-theme-body',
                  )}
                >
                  {cellValue(item, col, index)}
                </td>
              ))}
              {canWrite ? (
                <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="rounded-lg p-2 text-theme-muted hover:bg-aqua/10 hover:text-aqua"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openDeleteConfirm(item.id, item.organization || 'Unnamed organization', {
                          title: 'Delete client tracker?',
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

      <OnboardingFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <OnboardingFormModal
        open={Boolean(editing)}
        mode="edit"
        key={editing?.id ?? 'edit'}
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing) await onUpdate(editing.id, input)
        }}
      />

      {deleteModal}

      <RowDetailsModal
        open={Boolean(viewing)}
        title={viewing?.organization || 'Client tracker'}
        subtitle="Client Tracker"
        fields={viewing ? buildOnboardingDetailFields(viewing, viewingIndex) : []}
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
