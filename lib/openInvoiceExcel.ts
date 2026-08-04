import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import { resolveCurrency } from '@/lib/currency'
import {
  formatDocumentsForExport,
  formatExportDate,
  formatTextCellValue,
  matchesInvoiceNumberHeader,
  parseExcelDate,
  parseExcelSheet,
  toExportNumber,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'
import { formatCompanyNames, resolveInvoiceNumber } from '@/utils/format'

export const OPEN_INVOICE_HEADERS = [
  'S.No',
  'Invoice Date',
  'Customer Name',
  'Company Name',
  'Invoice Number',
  'Invoice Amount',
  'Currency',
  'Status',
  'Sales Person Name',
  'Documents',
  'Notes',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreateOpenInvoiceInput> = {
  'invoice date': 'invoiceDate',
  'customer name': 'customerName',
  'company name': 'companyName',
  'invoice number': 'invoiceNumber',
  'invoice no': 'invoiceNumber',
  'invoive number': 'invoiceNumber',
  'invoive no': 'invoiceNumber',
  'invoce number': 'invoiceNumber',
  'inv number': 'invoiceNumber',
  'inv no': 'invoiceNumber',
  'invoice #': 'invoiceNumber',
  'invoice id': 'invoiceNumber',
  'invoice amount': 'invoiceAmount',
  currency: 'currency',
  status: 'status',
  notes: 'notes',
  note: 'notes',
  remarks: 'notes',
  'sales person name': 'salesPersonName',
  'salesperson name': 'salesPersonName',
  'sales person': 'salesPersonName',
  salesperson: 'salesPersonName',
}

function isSerialColumn(header: string) {
  const normalized = header.trim().toLowerCase()
  return (
    normalized === 's no' ||
    normalized === 'sno' ||
    normalized === 's.no' ||
    normalized === 'serial no' ||
    normalized === 'serial number' ||
    normalized === 'sr no'
  )
}

function resolveField(header: string): keyof CreateOpenInvoiceInput | null {
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

  if (matchesInvoiceNumberHeader(normalized)) return 'invoiceNumber'
  if (normalized.includes('customer') && normalized.includes('name')) return 'customerName'
  if (normalized.includes('company') && normalized.includes('name')) return 'companyName'
  if (normalized.includes('invoice') && normalized.includes('amount')) return 'invoiceAmount'
  if (normalized.includes('invoice') && normalized.includes('date')) return 'invoiceDate'
  if (normalized === 'currency' || normalized === 'curr') return 'currency'
  if (normalized === 'status') return 'status'
  if (normalized.includes('note') || normalized.includes('remark')) return 'notes'
  if (normalized.includes('sales') && normalized.includes('person')) return 'salesPersonName'
  if (normalized === 'salesperson') return 'salesPersonName'

  return null
}

function emptyRecord(): CreateOpenInvoiceInput {
  return {
    invoiceDate: '',
    customerName: '',
    companyName: '',
    invoiceNumber: '',
    invoiceAmount: '',
    currency: 'USD',
    status: '',
    notes: '',
    salesPersonName: '',
  }
}

function assignField(
  record: CreateOpenInvoiceInput,
  field: keyof CreateOpenInvoiceInput,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') return
  if (field === 'documents') return

  if (field === 'invoiceDate') {
    const parsed = parseExcelDate(value)
    if (parsed) record[field] = parsed
    return
  }

  if (field === 'invoiceNumber') {
    const text = formatTextCellValue(value)
    if (text) record[field] = text
    return
  }

  const text = formatTextCellValue(value)
  if (text) record[field] = text
}

export async function parseOpenInvoicesExcel(file: File) {
  const records = await parseExcelSheet({
    file,
    resolveField,
    emptyRecord,
    assignField,
  })

  return { records, importedCount: records.length }
}

/** Best-effort field suggestions from an uploaded invoice file (Excel, PDF text, or filename). */
export async function suggestOpenInvoiceFromFile(
  file: File,
): Promise<Partial<CreateOpenInvoiceInput>> {
  const name = file.name.toLowerCase()
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf'

  if (isExcel) {
    try {
      const { records } = await parseOpenInvoicesExcel(file)
      const first = records[0]
      if (!first) return suggestFromFileName(file.name)
      const suggestion: Partial<CreateOpenInvoiceInput> = {}
      if (first.invoiceDate) suggestion.invoiceDate = first.invoiceDate
      if (first.customerName) suggestion.customerName = first.customerName
      if (first.companyName) suggestion.companyName = first.companyName
      if (first.invoiceNumber) suggestion.invoiceNumber = first.invoiceNumber
      if (first.invoiceAmount) suggestion.invoiceAmount = String(first.invoiceAmount)
      if (first.currency) suggestion.currency = first.currency
      if (first.status) suggestion.status = first.status
      if (first.notes) suggestion.notes = first.notes
      if (first.salesPersonName) suggestion.salesPersonName = first.salesPersonName
      return Object.keys(suggestion).length > 0 ? suggestion : suggestFromFileName(file.name)
    } catch {
      return suggestFromFileName(file.name)
    }
  }

  if (isPdf) {
    try {
      const text = await extractPdfText(file)
      const fromText = suggestFromInvoiceText(text)
      if (Object.keys(fromText).length > 0) {
        return { ...suggestFromFileName(file.name), ...fromText }
      }
    } catch {
      // Fall through to filename heuristics
    }
  }

  return suggestFromFileName(file.name)
}

async function extractPdfText(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocumentProxy(data)
  const result = await extractText(pdf, { mergePages: true })
  const text = result.text as string | string[] | undefined
  if (typeof text === 'string') return text
  if (Array.isArray(text)) return text.join('\n')
  return ''
}

export { extractPdfText }

function suggestFromInvoiceText(raw: string): Partial<CreateOpenInvoiceInput> {
  const text = raw.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!text) return {}

  const suggestion: Partial<CreateOpenInvoiceInput> = {}
  const compact = text.replace(/\n+/g, '\n')

  const invoiceNumber =
    compact.match(/Invoice\s*number\s*[:#]?\s*([A-Z0-9][A-Z0-9_./-]{2,})/i)?.[1] ||
    compact.match(/Invoice\s*#\s*[:#]?\s*([A-Z0-9][A-Z0-9_./-]{2,})/i)?.[1] ||
    compact.match(/Invoice\s*No\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9_./-]{2,})/i)?.[1] ||
    compact.match(/Receipt\s*number\s*[:#]?\s*([A-Z0-9][A-Z0-9_./-]{2,})/i)?.[1] ||
    compact.match(/Receipt\s*#\s*[:#]?\s*([A-Z0-9][A-Z0-9_./-]{2,})/i)?.[1]
  if (invoiceNumber) suggestion.invoiceNumber = invoiceNumber.trim()

  const amountMatch =
    compact.match(/(?:Amount\s*paid|Total\s*paid|Amount\s*due|Total\s*due|Grand\s*total|Total|Amount)\s*[:$]?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?)/i) ||
    compact.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2}))/)
  if (amountMatch?.[1]) {
    suggestion.invoiceAmount = amountMatch[1].replace(/,/g, '')
    if (/\$/.test(amountMatch[0]) || /USD/i.test(compact)) suggestion.currency = 'USD'
  }

  const currency = compact.match(/\b(USD|EUR|GBP|INR|AED|CAD|AUD)\b/i)?.[1]
  if (currency) suggestion.currency = currency.toUpperCase()

  const isoDate = compact.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (isoDate) {
    suggestion.invoiceDate = `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`
  } else {
    const named = compact.match(
      /\b(?:Date\s*paid|Invoice\s*date|Payment\s*date|Date)\s*[:-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2})/i,
    )
    const looseNamed = compact.match(
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2})\b/i,
    )
    const dateText = named?.[1] || looseNamed?.[1]
    if (dateText) {
      const parsed = new Date(dateText)
      if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear()
        const m = String(parsed.getMonth() + 1).padStart(2, '0')
        const d = String(parsed.getDate()).padStart(2, '0')
        suggestion.invoiceDate = `${y}-${m}-${d}`
      }
    } else {
      const dmy = compact.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/)
      if (dmy) {
        suggestion.invoiceDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
      }
    }
  }

  const billToBlock =
    compact.match(/Bill\s*to\s*\n+\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    compact.match(/Bill\s*to\s*[:-]?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    compact.match(/Customer\s*(?:name)?\s*[:-]?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1]
  if (billToBlock) {
    const name = billToBlock.split('\n')[0].trim()
    if (name && !/^(invoice|receipt|amount|date|payment)/i.test(name)) {
      suggestion.customerName = name
    }
  }

  return suggestion
}

function suggestFromFileName(fileName: string): Partial<CreateOpenInvoiceInput> {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
  const suggestion: Partial<CreateOpenInvoiceInput> = {}

  const invoiceNo =
    base.match(/\b(INV[-\s]?\d[\w-]*)\b/i)?.[1] ||
    base.match(/\b(INVOICE[-\s]?\d[\w-]*)\b/i)?.[1] ||
    base.match(/\bReceipt[-\s]?([A-Z0-9]+(?:-[A-Z0-9]+)+)\b/i)?.[1] ||
    base.match(/\b([0-9]{3,}-[0-9]{3,})\b/)?.[1]
  if (invoiceNo) {
    suggestion.invoiceNumber = String(invoiceNo).replace(/\s+/g, '-').toUpperCase()
  }

  const isoDate = base.match(/\b(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})\b/)
  if (isoDate) {
    const y = isoDate[1]
    const m = isoDate[2].padStart(2, '0')
    const d = isoDate[3].padStart(2, '0')
    suggestion.invoiceDate = `${y}-${m}-${d}`
  } else {
    const dmy = base.match(/\b(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})\b/)
    if (dmy) {
      const d = dmy[1].padStart(2, '0')
      const m = dmy[2].padStart(2, '0')
      const y = dmy[3]
      suggestion.invoiceDate = `${y}-${m}-${d}`
    }
  }

  const currency = base.match(/\b(USD|EUR|GBP|INR|AED|CAD|AUD)\b/i)?.[1]
  if (currency) suggestion.currency = currency.toUpperCase()

  const amount =
    base.match(/(?:USD|EUR|GBP|INR|AED|\$|€|£)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?)/i) ||
    base.match(/\b([0-9]{1,3}(?:,[0-9]{3})+\.\d{2})\b/)
  if (amount?.[1]) suggestion.invoiceAmount = amount[1].replace(/,/g, '')

  return suggestion
}

export async function exportOpenInvoicesExcel(invoices: OpenInvoice[]) {
  const rows = []
  for (let index = 0; index < invoices.length; index++) {
    const invoice = invoices[index]
    rows.push({
      'S.No': index + 1,
      'Invoice Date': formatExportDate(invoice.invoiceDate),
      'Customer Name': invoice.customerName ?? '',
      'Company Name': formatCompanyNames(invoice.companyName),
      'Invoice Number': resolveInvoiceNumber(invoice as unknown as Record<string, unknown>),
      'Invoice Amount': toExportNumber(invoice.invoiceAmount),
      Currency: resolveCurrency(invoice.currency, invoice.invoiceAmount),
      Status: invoice.status ?? '',
      'Sales Person Name': invoice.salesPersonName ?? '',
      Documents: await formatDocumentsForExport(invoice.documents),
      Notes: invoice.notes ?? '',
    })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Open Invoices', OPEN_INVOICE_HEADERS, rows, `open-invoices-${timestamp}.xlsx`, {
    moneyHeaders: ['Invoice Amount'],
  })
}

export function downloadOpenInvoiceTemplate() {
  downloadExcelTemplate('Open Invoices', OPEN_INVOICE_HEADERS, 'open-invoices-sample.xlsx')
}
