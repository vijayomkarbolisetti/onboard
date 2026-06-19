import * as XLSX from 'xlsx'
import type {
  CreateOnboardingInvoiceInput,
  OnboardingInvoiceRecord,
  SaasMspAgreement,
} from '@/types'

export const ONBOARDING_INVOICE_HEADERS = [
  'Company Name',
  'Saas / MSP Agreement',
  'Sponsor',
  'Partner Program',
  'Point Of Contact',
  'Person Email Id',
  'On Board Date',
  'Invoice Amount',
  '1st Invoice Date',
  'Invoice Cycle',
  'No. Invoices Generated',
  'No. Invoices Paid',
  'Next Invoice Status',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreateOnboardingInvoiceInput> = {
  'company name': 'companyName',
  'saas / msp agreement': 'saasMspAgreement',
  'saas/msp agreement': 'saasMspAgreement',
  sponsor: 'sponsor',
  'partner program': 'partnerProgram',
  'point of contact': 'pointOfContact',
  'person email id': 'personEmailId',
  'person email': 'personEmailId',
  'on board date': 'onBoardDate',
  'invoice amount': 'invoiceAmount',
  '1st invoice date': 'firstInvoiceDate',
  'first invoice date': 'firstInvoiceDate',
  'invoice cycle': 'invoiceCycle',
  'no. invoices generated': 'invoicesGenerated',
  'no of invoices generated': 'invoicesGenerated',
  'no. invoices paid': 'invoicesPaid',
  'no of invoices paid': 'invoicesPaid',
  'next invoice status': 'nextInvoiceStatus',
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls']

export function isExcelFile(file: File) {
  const name = file.name.toLowerCase()
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseAgreement(value: unknown): SaasMspAgreement | null {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'SAAS' || normalized === 'S') return 'SaaS'
  if (normalized === 'MSP' || normalized === 'M') return 'MSP'
  return null
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return ''
  }
  if (typeof value === 'number') {
    const dateParts = XLSX.SSF.parse_date_code(value)
    if (dateParts) {
      const date = new Date(dateParts.y, dateParts.m - 1, dateParts.d)
      return date.toISOString().slice(0, 10)
    }
  }
  return ''
}

function emptyRecord(): CreateOnboardingInvoiceInput {
  return {
    companyName: '',
    saasMspAgreement: 'SaaS',
    sponsor: '',
    partnerProgram: '',
    pointOfContact: '',
    personEmailId: '',
    onBoardDate: '',
    invoiceAmount: 0,
    firstInvoiceDate: '',
    invoiceCycle: '',
    invoicesGenerated: 0,
    invoicesPaid: 0,
    nextInvoiceStatus: '',
  }
}

function rowToRecord(row: Record<string, unknown>): CreateOnboardingInvoiceInput {
  const record = emptyRecord()

  for (const [header, value] of Object.entries(row)) {
    const field = HEADER_TO_FIELD[normalizeHeader(header)]
    if (!field) continue

    if (field === 'saasMspAgreement') {
      const raw = String(value ?? '').trim()
      if (!raw) continue
      const agreement = parseAgreement(value)
      if (agreement) record.saasMspAgreement = agreement
      continue
    }

    if (field === 'invoiceAmount' || field === 'invoicesGenerated' || field === 'invoicesPaid') {
      const raw = String(value ?? '').trim()
      if (!raw) continue
      record[field] = parseNumber(value)
      continue
    }

    if (field === 'onBoardDate' || field === 'firstInvoiceDate') {
      const parsed = parseExcelDate(value)
      if (parsed) record[field] = parsed
      continue
    }

    const text = String(value ?? '').trim()
    if (text) record[field] = text
  }

  return record
}

export async function parseOnboardingInvoicesExcel(file: File) {
  if (!isExcelFile(file)) {
    throw new Error('Only Excel files (.xlsx, .xls) are supported')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('The Excel file has no worksheets')
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: '' },
  )

  if (rows.length === 0) {
    throw new Error('The Excel file has no data rows')
  }

  const records: CreateOnboardingInvoiceInput[] = []

  rows.forEach((row) => {
    const hasValues = Object.values(row).some(
      (value) => String(value ?? '').trim() !== '',
    )
    if (!hasValues) return

    records.push(rowToRecord(row))
  })

  if (records.length === 0) {
    throw new Error('No valid rows found in the Excel file')
  }

  return { records, errors: [], importedCount: records.length }
}

function formatExportDate(value: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function exportOnboardingInvoicesExcel(records: OnboardingInvoiceRecord[]) {
  const rows = records.map((record) => ({
    'Company Name': record.companyName,
    'Saas / MSP Agreement': record.saasMspAgreement,
    Sponsor: record.sponsor,
    'Partner Program': record.partnerProgram,
    'Point Of Contact': record.pointOfContact,
    'Person Email Id': record.personEmailId,
    'On Board Date': formatExportDate(record.onBoardDate),
    'Invoice Amount': record.invoiceAmount,
    '1st Invoice Date': formatExportDate(record.firstInvoiceDate),
    'Invoice Cycle': record.invoiceCycle,
    'No. Invoices Generated': record.invoicesGenerated,
    'No. Invoices Paid': record.invoicesPaid,
    'Next Invoice Status': record.nextInvoiceStatus,
  }))

  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: [...ONBOARDING_INVOICE_HEADERS] })
      : XLSX.utils.aoa_to_sheet([[...ONBOARDING_INVOICE_HEADERS]])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Onboarding & Invoices')

  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `onboarding-invoices-${timestamp}.xlsx`)
}

export function downloadOnboardingInvoiceTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([[...ONBOARDING_INVOICE_HEADERS]])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
  XLSX.writeFile(workbook, 'onboarding-invoices-template.xlsx')
}
