import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'
import {
  hasRowData,
  normalizeHeader,
  parseExcelDate,
  parseNumber,
  readExcelRows,
  writeExcelFile,
} from '@/lib/excelUtils'

export const OPEN_INVOICE_HEADERS = [
  'Invoice Date',
  'Customer Name',
  'Company Name',
  'Invoice Number',
  'Invoice Amount',
  'Status',
  'Notes',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreateOpenInvoiceInput> = {
  'invoice date': 'invoiceDate',
  'customer name': 'customerName',
  'company name': 'companyName',
  'invoice number': 'invoiceNumber',
  'invoice amount': 'invoiceAmount',
  status: 'status',
  notes: 'notes',
}

function emptyRecord(): CreateOpenInvoiceInput {
  return {
    invoiceDate: '',
    customerName: '',
    companyName: '',
    invoiceNumber: '',
    invoiceAmount: 0,
    status: '',
    notes: '',
  }
}

function rowToRecord(row: Record<string, unknown>): CreateOpenInvoiceInput {
  const record = emptyRecord()

  for (const [header, value] of Object.entries(row)) {
    const field = HEADER_TO_FIELD[normalizeHeader(header)]
    if (!field) continue

    if (field === 'invoiceAmount') {
      const raw = String(value ?? '').trim()
      if (!raw) continue
      record[field] = parseNumber(value)
      continue
    }

    if (field === 'invoiceDate') {
      const parsed = parseExcelDate(value)
      if (parsed) record[field] = parsed
      continue
    }

    const text = String(value ?? '').trim()
    if (text) record[field] = text
  }

  return record
}

export async function parseOpenInvoicesExcel(file: File) {
  const rows = await readExcelRows(file)
  const records = rows.filter(hasRowData).map(rowToRecord)

  if (records.length === 0) {
    throw new Error('No valid rows found in the Excel file')
  }

  return { records, importedCount: records.length }
}

export function exportOpenInvoicesExcel(invoices: OpenInvoice[]) {
  const rows = invoices.map((invoice) => ({
    'Invoice Date': invoice.invoiceDate?.slice(0, 10) ?? '',
    'Customer Name': invoice.customerName,
    'Company Name': invoice.companyName,
    'Invoice Number': invoice.invoiceNumber,
    'Invoice Amount': invoice.invoiceAmount,
    Status: invoice.status,
    Notes: invoice.notes,
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Open Invoices', OPEN_INVOICE_HEADERS, rows, `open-invoices-${timestamp}.xlsx`)
}
