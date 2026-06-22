import * as XLSX from 'xlsx'
import {
  autoFitWorksheetColumns,
  cellDisplayValue,
  formatExportDate,
  hasRowData,
  isExcelFile,
  normalizeHeader,
  parseExcelDate,
  parseInteger,
  parseNumber,
} from '@/lib/excelUtils'
import type {
  CreateOnboardingInvoiceInput,
  OnboardingInvoiceRecord,
  SaasMspAgreement,
} from '@/types'

export { isExcelFile } from '@/lib/excelUtils'

export const ONBOARDING_INVOICE_HEADERS = [
  'Company Name',
  'Subscription Summary',
  'Agreement Document Link',
  'Saas / MSP Agreement',
  'Sponsor',
  'Partner Program',
  'Point Of Contact',
  'Person Email Id',
  'On Board Date',
  'Invoice Amount',
  '1st Invoice Date',
  'Invoice Cycle',
  'No. of Invoices Generated',
  'No. of Invoices Paid',
  'Total Amount Paid',
  'Pending Amount',
  'Next Invoice Status',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreateOnboardingInvoiceInput> = {
  'company name': 'companyName',
  'subscription summary': 'subscriptionSummary',
  'agreement document link': 'agreementDocumentLink',
  'agreement document': 'agreementDocumentLink',
  'saas msp agreement': 'saasMspAgreement',
  'saas / msp agreement': 'saasMspAgreement',
  sponsor: 'sponsor',
  'partner program': 'partnerProgram',
  'point of contact': 'pointOfContact',
  'person email id': 'personEmailId',
  'person email': 'personEmailId',
  'on board date': 'onBoardDate',
  'onboard date': 'onBoardDate',
  'invoice amount': 'invoiceAmount',
  '1st invoice date': 'firstInvoiceDate',
  'first invoice date': 'firstInvoiceDate',
  'invoice cycle': 'invoiceCycle',
  'no invoices generated': 'invoicesGenerated',
  'no of invoices generated': 'invoicesGenerated',
  'noof invoices generated': 'invoicesGenerated',
  'no invoices paid': 'invoicesPaid',
  'no of invoices paid': 'invoicesPaid',
  'noof invoices paid': 'invoicesPaid',
  'total amount paid': 'totalAmountPaid',
  'pending amount': 'pendingAmount',
  'next invoice status': 'nextInvoiceStatus',
}

function resolveField(header: string): keyof CreateOnboardingInvoiceInput | null {
  const normalized = normalizeHeader(header)
  if (!normalized) return null
  if (HEADER_TO_FIELD[normalized]) return HEADER_TO_FIELD[normalized]

  if (normalized.includes('company') && normalized.includes('name')) return 'companyName'
  if (normalized.includes('subscription') && normalized.includes('summary')) {
    return 'subscriptionSummary'
  }
  if (normalized.includes('agreement') && normalized.includes('document')) {
    return 'agreementDocumentLink'
  }
  if (normalized.includes('saas') || normalized.includes('msp')) return 'saasMspAgreement'
  if (normalized.includes('partner') && normalized.includes('program')) return 'partnerProgram'
  if (normalized.includes('point') && normalized.includes('contact')) return 'pointOfContact'
  if (normalized.includes('person') && normalized.includes('email')) return 'personEmailId'
  if (normalized.includes('on') && normalized.includes('board')) return 'onBoardDate'
  if (normalized.includes('invoice') && normalized.includes('amount')) return 'invoiceAmount'
  if (
    (normalized.includes('1st') || normalized.includes('first')) &&
    normalized.includes('invoice') &&
    normalized.includes('date')
  ) {
    return 'firstInvoiceDate'
  }
  if (normalized.includes('invoice') && normalized.includes('cycle')) return 'invoiceCycle'
  if (normalized.includes('generated')) return 'invoicesGenerated'
  if (normalized.includes('pending') && normalized.includes('amount')) return 'pendingAmount'
  if (normalized.includes('total') && normalized.includes('amount') && normalized.includes('paid')) {
    return 'totalAmountPaid'
  }
  if (normalized.includes('paid') && normalized.includes('invoice')) return 'invoicesPaid'
  if (normalized.includes('next') && normalized.includes('status')) return 'nextInvoiceStatus'
  if (normalized === 'sponsor') return 'sponsor'

  return null
}

function parseAgreement(value: unknown): SaasMspAgreement | null {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'SAAS' || normalized === 'S') return 'SaaS'
  if (normalized === 'MSP' || normalized === 'M') return 'MSP'
  return null
}

function emptyRecord(): CreateOnboardingInvoiceInput {
  return {
    companyName: '',
    subscriptionSummary: '',
    agreementDocumentLink: '',
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
    totalAmountPaid: 0,
    pendingAmount: 0,
    nextInvoiceStatus: '',
  }
}

function assignField(
  record: CreateOnboardingInvoiceInput,
  field: keyof CreateOnboardingInvoiceInput,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') return

  if (field === 'saasMspAgreement') {
    const agreement = parseAgreement(value)
    if (agreement) record.saasMspAgreement = agreement
    return
  }

  if (field === 'invoiceAmount' || field === 'totalAmountPaid' || field === 'pendingAmount') {
    record[field] = parseNumber(value)
    return
  }

  if (field === 'invoicesGenerated' || field === 'invoicesPaid') {
    record[field] = parseInteger(value)
    return
  }

  if (field === 'onBoardDate' || field === 'firstInvoiceDate') {
    const parsed = parseExcelDate(value)
    if (parsed) record[field] = parsed
    return
  }

  const text = String(value).trim()
  if (text) record[field] = text as never
}

function findHeaderRow(matrix: unknown[][]) {
  let headerRowIndex = 0
  let bestScore = 0

  for (let row = 0; row < Math.min(matrix.length, 8); row++) {
    const score = matrix[row].reduce<number>((count, cell) => {
      return resolveField(String(cell ?? '')) ? count + 1 : count
    }, 0)

    if (score > bestScore) {
      bestScore = score
      headerRowIndex = row
    }
  }

  return { headerRowIndex, bestScore }
}

function rowsFromSheet(sheet: XLSX.WorkSheet): CreateOnboardingInvoiceInput[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (matrix.length < 2) return []

  const { headerRowIndex, bestScore } = findHeaderRow(matrix)
  if (bestScore < 2) return []

  const headerRow = matrix[headerRowIndex] ?? []
  const fieldByColumn = headerRow.map((header) => resolveField(String(header ?? '')))
  const records: CreateOnboardingInvoiceInput[] = []

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex] ?? []
    const rowObject: Record<string, unknown> = {}

    row.forEach((value, columnIndex) => {
      const field = fieldByColumn[columnIndex]
      if (!field) return
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })]
      rowObject[field] = cellDisplayValue(cell) || value
    })

    if (!hasRowData(rowObject)) continue

    const record = emptyRecord()
    for (const [field, value] of Object.entries(rowObject)) {
      assignField(record, field as keyof CreateOnboardingInvoiceInput, value)
    }
    records.push(record)
  }

  return records
}

export async function parseOnboardingInvoicesExcel(file: File) {
  if (!isExcelFile(file)) {
    throw new Error('Only Excel files (.xlsx, .xls) are supported')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('The Excel file has no worksheets')
  }

  const records = rowsFromSheet(workbook.Sheets[sheetName])

  if (records.length === 0) {
    throw new Error('No valid rows found in the Excel file')
  }

  return { records, errors: [], importedCount: records.length }
}

export function exportOnboardingInvoicesExcel(records: OnboardingInvoiceRecord[]) {
  const rows = records.map((record) => ({
    'Company Name': record.companyName,
    'Subscription Summary': record.subscriptionSummary ?? '',
    'Agreement Document Link': record.agreementDocumentLink ?? '',
    'Saas / MSP Agreement': record.saasMspAgreement,
    Sponsor: record.sponsor,
    'Partner Program': record.partnerProgram,
    'Point Of Contact': record.pointOfContact,
    'Person Email Id': record.personEmailId,
    'On Board Date': formatExportDate(record.onBoardDate),
    'Invoice Amount': record.invoiceAmount,
    '1st Invoice Date': formatExportDate(record.firstInvoiceDate),
    'Invoice Cycle': record.invoiceCycle,
    'No. of Invoices Generated': record.invoicesGenerated,
    'No. of Invoices Paid': record.invoicesPaid,
    'Total Amount Paid': record.totalAmountPaid ?? 0,
    'Pending Amount': record.pendingAmount ?? 0,
    'Next Invoice Status': record.nextInvoiceStatus,
  }))

  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: [...ONBOARDING_INVOICE_HEADERS] })
      : XLSX.utils.aoa_to_sheet([[...ONBOARDING_INVOICE_HEADERS]])

  autoFitWorksheetColumns(worksheet, { maxWidth: 70 })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Onboarding & Invoices')

  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `onboarding-invoices-${timestamp}.xlsx`)
}

export function downloadOnboardingInvoiceTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([[...ONBOARDING_INVOICE_HEADERS]])
  autoFitWorksheetColumns(worksheet, { maxWidth: 70 })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
  XLSX.writeFile(workbook, 'onboarding-invoices-template.xlsx')
}
