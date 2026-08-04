import type { CreateOpenInvoiceInput, CreatePaidInvoiceInput, PaidInvoice } from '@/types'
import { resolveCurrency } from '@/lib/currency'
import {
  formatExportDate,
  formatTextCellValue,
  matchesInvoiceNumberHeader,
  parseExcelDate,
  parseExcelSheet,
  resolveDocumentsForExport,
  toExportNumber,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'
import { extractPdfText, suggestOpenInvoiceFromFile } from '@/lib/openInvoiceExcel'
import { formatCompanyNames, resolveInvoiceNumber } from '@/utils/format'

export const PAID_INVOICE_HEADERS = [
  'S.No',
  'Invoice Date',
  'Customer Name',
  'Company Name',
  'Invoice Number',
  'Invoice Amount',
  'Currency',
  'Status',
  'Payment Date',
  'Payment Method',
  'Sales Person Name',
  'Documents',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreatePaidInvoiceInput> = {
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
  'payment date': 'paymentDate',
  'payment method': 'paymentMethod',
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

function resolveField(header: string): keyof CreatePaidInvoiceInput | null {
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
  if (normalized.includes('payment') && normalized.includes('date')) return 'paymentDate'
  if (normalized.includes('payment') && normalized.includes('method')) return 'paymentMethod'
  if (normalized.includes('invoice') && normalized.includes('amount')) return 'invoiceAmount'
  if (normalized.includes('invoice') && normalized.includes('date')) return 'invoiceDate'
  if (normalized === 'currency' || normalized === 'curr') return 'currency'
  if (normalized === 'status') return 'status'
  if (normalized.includes('sales') && normalized.includes('person')) return 'salesPersonName'
  if (normalized === 'salesperson') return 'salesPersonName'

  return null
}

function emptyRecord(): CreatePaidInvoiceInput {
  return {
    invoiceDate: '',
    customerName: '',
    companyName: '',
    invoiceNumber: '',
    invoiceAmount: '',
    currency: 'USD',
    status: '',
    paymentDate: '',
    paymentMethod: '',
    salesPersonName: '',
  }
}

function assignField(
  record: CreatePaidInvoiceInput,
  field: keyof CreatePaidInvoiceInput,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') return
  if (field === 'documents') return

  if (field === 'invoiceDate' || field === 'paymentDate') {
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

export async function parsePaidInvoicesExcel(file: File) {
  const records = await parseExcelSheet({
    file,
    resolveField,
    emptyRecord,
    assignField,
  })

  return { records, importedCount: records.length }
}

/** Best-effort field suggestions from an uploaded paid-invoice file (Excel, PDF text, or filename). */
export async function suggestPaidInvoiceFromFile(
  file: File,
): Promise<Partial<CreatePaidInvoiceInput>> {
  const name = file.name.toLowerCase()
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf'

  if (isExcel) {
    try {
      const { records } = await parsePaidInvoicesExcel(file)
      const first = records[0]
      if (!first) {
        const fallback = await suggestOpenInvoiceFromFile(file)
        return mapOpenSuggestionToPaid(fallback)
      }
      const suggestion: Partial<CreatePaidInvoiceInput> = {}
      if (first.invoiceDate) suggestion.invoiceDate = first.invoiceDate
      if (first.customerName) suggestion.customerName = first.customerName
      if (first.companyName) suggestion.companyName = first.companyName
      if (first.invoiceNumber) suggestion.invoiceNumber = first.invoiceNumber
      if (first.invoiceAmount) suggestion.invoiceAmount = String(first.invoiceAmount)
      if (first.currency) suggestion.currency = first.currency
      if (first.status) suggestion.status = first.status
      if (first.paymentDate) suggestion.paymentDate = first.paymentDate
      if (first.paymentMethod) suggestion.paymentMethod = first.paymentMethod
      if (first.salesPersonName) suggestion.salesPersonName = first.salesPersonName
      if (!suggestion.status) suggestion.status = 'Paid'
      if (!suggestion.paymentDate && suggestion.invoiceDate) {
        suggestion.paymentDate = suggestion.invoiceDate
      }
      return Object.keys(suggestion).length > 0
        ? suggestion
        : mapOpenSuggestionToPaid(await suggestOpenInvoiceFromFile(file))
    } catch {
      return mapOpenSuggestionToPaid(await suggestOpenInvoiceFromFile(file))
    }
  }

  const base = mapOpenSuggestionToPaid(await suggestOpenInvoiceFromFile(file))

  if (isPdf) {
    try {
      const text = await extractPdfText(file)
      const method =
        text.match(/Payment\s*method\s*[:#]?\s*([^\n\r]+)/i)?.[1]?.trim() ||
        text.match(/\b(Visa|Mastercard|Amex|American Express|Card|Credit Card|Debit Card|Bank transfer|Wire|ACH|UPI|PayPal|Stripe)\b/i)?.[1]
      if (method) base.paymentMethod = method.replace(/\s+/g, ' ').trim()

      const datePaid =
        text.match(/Date\s*paid\s*[:#]?\s*([^\n\r]+)/i)?.[1]?.trim() ||
        text.match(/Payment\s*date\s*[:#]?\s*([^\n\r]+)/i)?.[1]?.trim()
      if (datePaid) {
        const named = datePaid.match(
          /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2})\b/i,
        )
        if (named?.[1]) {
          const parsed = new Date(named[1])
          if (!Number.isNaN(parsed.getTime())) {
            const y = parsed.getFullYear()
            const m = String(parsed.getMonth() + 1).padStart(2, '0')
            const d = String(parsed.getDate()).padStart(2, '0')
            base.paymentDate = `${y}-${m}-${d}`
            if (!base.invoiceDate) base.invoiceDate = base.paymentDate
          }
        }
      }
    } catch {
      // Keep base suggestion
    }
  }

  if (!base.status) base.status = 'Paid'
  if (!base.paymentDate && base.invoiceDate) base.paymentDate = base.invoiceDate

  return base
}

function mapOpenSuggestionToPaid(
  open: Partial<CreateOpenInvoiceInput>,
): Partial<CreatePaidInvoiceInput> {
  const suggestion: Partial<CreatePaidInvoiceInput> = {}
  if (open.invoiceDate) suggestion.invoiceDate = open.invoiceDate
  if (open.customerName) suggestion.customerName = open.customerName
  if (open.companyName) suggestion.companyName = open.companyName
  if (open.invoiceNumber) suggestion.invoiceNumber = open.invoiceNumber
  if (open.invoiceAmount) suggestion.invoiceAmount = open.invoiceAmount
  if (open.currency) suggestion.currency = open.currency
  if (open.status) suggestion.status = open.status
  if (open.salesPersonName) suggestion.salesPersonName = open.salesPersonName
  return suggestion
}

export async function exportPaidInvoicesExcel(invoices: PaidInvoice[]) {
  const rows = []
  const documentLinks: Array<string | undefined> = []

  for (let index = 0; index < invoices.length; index++) {
    const invoice = invoices[index]
    const documents = resolveDocumentsForExport(invoice.documents)
    documentLinks.push(documents.url)
    rows.push({
      'S.No': index + 1,
      'Invoice Date': formatExportDate(invoice.invoiceDate),
      'Customer Name': invoice.customerName ?? '',
      'Company Name': formatCompanyNames(invoice.companyName),
      'Invoice Number': resolveInvoiceNumber(invoice as unknown as Record<string, unknown>),
      'Invoice Amount': toExportNumber(invoice.invoiceAmount),
      Currency: resolveCurrency(invoice.currency, invoice.invoiceAmount),
      Status: invoice.status ?? '',
      'Payment Date': formatExportDate(invoice.paymentDate),
      'Payment Method': invoice.paymentMethod ?? '',
      'Sales Person Name': invoice.salesPersonName ?? '',
      Documents: documents.text,
    })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Paid Invoices', PAID_INVOICE_HEADERS, rows, `paid-invoices-${timestamp}.xlsx`, {
    moneyHeaders: ['Invoice Amount'],
    columnHyperlinks: { Documents: documentLinks },
  })
}

export function downloadPaidInvoiceTemplate() {
  downloadExcelTemplate('Paid Invoices', PAID_INVOICE_HEADERS, 'paid-invoices-sample.xlsx')
}
