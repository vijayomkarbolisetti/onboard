import type { CreateOnboardingInput, Onboarding } from '@/types'
import {
  formatExportDate,
  formatTextCellValue,
  parseExcelDate,
  parseExcelSheet,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'

export const ONBOARDING_HEADERS = [
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

function exportText(value: string | number | undefined | null) {
  if (value === null || value === undefined) return ''
  return String(value)
}

const HEADER_TO_FIELD: Record<string, keyof CreateOnboardingInput> = {
  organization: 'organization',
  'committed months': 'committedMonths',
  'agreement signed date': 'agreementSignedDate',
  'no of ai sdrs': 'noOfAiSdrs',
  'no of ai sdr': 'noOfAiSdrs',
  'onboarding date': 'onboardingDate',
  'end date': 'endDate',
  'comitted amount': 'committedAmount',
  'committed amount': 'committedAmount',
  'paid amount': 'paidAmount',
  '1st campaign launch date': 'campaignLaunchDate',
  'first campaign launch date': 'campaignLaunchDate',
  'campaign launch date': 'campaignLaunchDate',
  'no of campaigns': 'noOfCampaigns',
  'no of campaign': 'noOfCampaigns',
  'targeted leads': 'targetedLeads',
  'contacted leads': 'contactedLeads',
  'interested leads': 'interestedLeads',
  'total replies': 'totalReplies',
  status: 'status',
  remark: 'remark',
  remarks: 'remark',
}

function isSerialColumn(header: string) {
  const normalized = header
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (
    normalized === 's no' ||
    normalized === 'sno' ||
    normalized === 'no' ||
    normalized === 'serial' ||
    normalized === 'sr no' ||
    normalized === '#'
  )
}

function resolveField(header: string): keyof CreateOnboardingInput | null {
  const normalized = header
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]/g, '')
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized || isSerialColumn(normalized)) return null
  if (HEADER_TO_FIELD[normalized]) return HEADER_TO_FIELD[normalized]

  if (normalized.includes('organization') || normalized === 'company') return 'organization'
  if (normalized.includes('committed') && normalized.includes('month')) return 'committedMonths'
  if (normalized.includes('agreement') && normalized.includes('signed')) {
    return 'agreementSignedDate'
  }
  if (normalized.includes('ai') && normalized.includes('sdr')) return 'noOfAiSdrs'
  if (normalized.includes('onboarding') && normalized.includes('date')) return 'onboardingDate'
  if (normalized === 'end date') return 'endDate'
  if (normalized.includes('committed') && normalized.includes('amount')) return 'committedAmount'
  if (normalized.includes('comitted') && normalized.includes('amount')) return 'committedAmount'
  if (normalized.includes('paid') && normalized.includes('amount')) return 'paidAmount'
  if (normalized.includes('campaign') && normalized.includes('launch')) return 'campaignLaunchDate'
  if (normalized.includes('campaign')) return 'noOfCampaigns'
  if (normalized.includes('targeted') && normalized.includes('lead')) return 'targetedLeads'
  if (normalized.includes('contacted') && normalized.includes('lead')) return 'contactedLeads'
  if (normalized.includes('interested') && normalized.includes('lead')) return 'interestedLeads'
  if (normalized.includes('total') && normalized.includes('repl')) return 'totalReplies'
  if (normalized === 'status') return 'status'
  if (normalized.includes('remark')) return 'remark'

  return null
}

function emptyRecord(): CreateOnboardingInput {
  return {
    organization: '',
    committedMonths: '',
    agreementSignedDate: '',
    noOfAiSdrs: '',
    onboardingDate: '',
    endDate: '',
    committedAmount: '',
    paidAmount: '',
    campaignLaunchDate: '',
    noOfCampaigns: '',
    targetedLeads: '',
    contactedLeads: '',
    interestedLeads: '',
    totalReplies: '',
    status: '',
    remark: '',
  }
}

const DATE_FIELDS = new Set<keyof CreateOnboardingInput>([
  'agreementSignedDate',
  'onboardingDate',
  'endDate',
  'campaignLaunchDate',
])

function assignField(
  record: CreateOnboardingInput,
  field: keyof CreateOnboardingInput,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') return

  if (DATE_FIELDS.has(field)) {
    const parsed = parseExcelDate(value)
    if (parsed) record[field] = parsed as never
    return
  }

  const text = formatTextCellValue(value)
  if (text) record[field] = text as never
}

export async function parseOnboardingsExcel(file: File) {
  const records = await parseExcelSheet({
    file,
    resolveField,
    emptyRecord,
    assignField,
  })

  return { records, importedCount: records.length }
}

export function exportOnboardingsExcel(onboardings: Onboarding[]) {
  const rows = onboardings.map((item, index) => ({
    'S.No': index + 1,
    Organization: item.organization ?? '',
    'Committed Months': exportText(item.committedMonths),
    'Agreement Signed Date': formatExportDate(item.agreementSignedDate),
    'No.of AI SDRs': exportText(item.noOfAiSdrs),
    'Onboarding Date': formatExportDate(item.onboardingDate),
    'End Date': formatExportDate(item.endDate),
    'Comitted Amount': exportText(item.committedAmount),
    'Paid Amount': exportText(item.paidAmount),
    '1st campaign Launch date': formatExportDate(item.campaignLaunchDate),
    'no.of campaigns': exportText(item.noOfCampaigns),
    'Targeted Leads': exportText(item.targetedLeads),
    'Contacted Leads': exportText(item.contactedLeads),
    'Interested Leads': exportText(item.interestedLeads),
    'Total Replies': exportText(item.totalReplies),
    Status: item.status ?? '',
    Remark: item.remark ?? '',
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Client Tracker', ONBOARDING_HEADERS, rows, `client-tracker-${timestamp}.xlsx`)
}

export function downloadOnboardingTemplate() {
  downloadExcelTemplate('Client Tracker', ONBOARDING_HEADERS, 'client-tracker-sample.xlsx')
}
