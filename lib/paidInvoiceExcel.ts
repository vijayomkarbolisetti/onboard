import type { CreatePaidInvoiceInput, PaidInvoice } from '@/types'
import {
  hasRowData,
  normalizeHeader,
  parseExcelDate,
  parseNumber,
  readExcelRows,
  writeExcelFile,
} from '@/lib/excelUtils'

export const PAID_INVOICE_HEADERS = [
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
  'invoice amount': 'invoiceAmount',
  status: 'status',
  'payment date': 'paymentDate',
  'payment method': 'paymentMethod',
}

function emptyRecord(): CreatePaidInvoiceInput {
  return {
    invoiceDate: '',
    customerName: '',
    companyName: '',
    invoiceNumber: '',
    invoiceAmount: 0,
    status: '',
    paymentDate: '',
    paymentMethod: '',
  }
}

function rowToRecord(row: Record<string, unknown>): CreatePaidInvoiceInput {
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

    if (field === 'invoiceDate' || field === 'paymentDate') {
      const parsed = parseExcelDate(value)
      if (parsed) record[field] = parsed
      continue
    }

    const text = String(value ?? '').trim()
    if (text) record[field] = text
  }

  return record
}

export async function parsePaidInvoicesExcel(file: File) {
  const rows = await readExcelRows(file)
  const records = rows.filter(hasRowData).map(rowToRecord)

  if (records.length === 0) {
    throw new Error('No valid rows found in the Excel file')
  }

  return { records, importedCount: records.length }
}

export function exportPaidInvoicesExcel(invoices: PaidInvoice[]) {
  const rows = invoices.map((invoice) => ({
    'Invoice Date': invoice.invoiceDate?.slice(0, 10) ?? '',
    'Customer Name': invoice.customerName,
    'Company Name': invoice.companyName,
    'Invoice Number': invoice.invoiceNumber,
    'Invoice Amount': invoice.invoiceAmount,
    Status: invoice.status,
    'Payment Date': invoice.paymentDate?.slice(0, 10) ?? '',
    'Payment Method': invoice.paymentMethod,
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Paid Invoices', PAID_INVOICE_HEADERS, rows, `paid-invoices-${timestamp}.xlsx`)
}
