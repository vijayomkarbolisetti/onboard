import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import {
  formatDocumentsForExport,
  formatExportDate,
  formatTextCellValue,
  matchesInvoiceNumberHeader,
  parseExcelDate,
  parseExcelSheet,
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
      'Invoice Amount': invoice.invoiceAmount != null ? String(invoice.invoiceAmount) : '',
      Status: invoice.status ?? '',
      'Sales Person Name': invoice.salesPersonName ?? '',
      Documents: await formatDocumentsForExport(invoice.documents),
      Notes: invoice.notes ?? '',
    })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Open Invoices', OPEN_INVOICE_HEADERS, rows, `open-invoices-${timestamp}.xlsx`)
}

export function downloadOpenInvoiceTemplate() {
  downloadExcelTemplate('Open Invoices', OPEN_INVOICE_HEADERS, 'open-invoices-sample.xlsx')
}
