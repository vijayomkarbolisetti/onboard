import type { CreatePaidInvoiceInput, PaidInvoice } from '@/types'
import {
  formatExportDate,
  formatTextCellValue,
  matchesInvoiceNumberHeader,
  parseExcelDate,
  parseExcelSheet,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'
import { formatCompanyNames, resolveInvoiceNumber } from '@/utils/format'

export const PAID_INVOICE_HEADERS = [
  'S.No',
  'Invoice Date',
  'Customer Name',
  'Company Name',
  'Invoice Number',
  'Invoice Amount',
  'Status',
  'Payment Date',
  'Payment Method',
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
  status: 'status',
  'payment date': 'paymentDate',
  'payment method': 'paymentMethod',
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
  if (normalized === 'status') return 'status'

  return null
}

function emptyRecord(): CreatePaidInvoiceInput {
  return {
    invoiceDate: '',
    customerName: '',
    companyName: '',
    invoiceNumber: '',
    invoiceAmount: '',
    status: '',
    paymentDate: '',
    paymentMethod: '',
  }
}

function assignField(
  record: CreatePaidInvoiceInput,
  field: keyof CreatePaidInvoiceInput,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') return

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

export function exportPaidInvoicesExcel(invoices: PaidInvoice[]) {
  const rows = invoices.map((invoice, index) => ({
    'S.No': index + 1,
    'Invoice Date': formatExportDate(invoice.invoiceDate),
    'Customer Name': invoice.customerName ?? '',
    'Company Name': formatCompanyNames(invoice.companyName),
    'Invoice Number': resolveInvoiceNumber(invoice as unknown as Record<string, unknown>),
    'Invoice Amount': invoice.invoiceAmount != null ? String(invoice.invoiceAmount) : '',
    Status: invoice.status ?? '',
    'Payment Date': formatExportDate(invoice.paymentDate),
    'Payment Method': invoice.paymentMethod ?? '',
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Paid Invoices', PAID_INVOICE_HEADERS, rows, `paid-invoices-${timestamp}.xlsx`)
}

export function downloadPaidInvoiceTemplate() {
  downloadExcelTemplate('Paid Invoices', PAID_INVOICE_HEADERS, 'paid-invoices-sample.xlsx')
}
