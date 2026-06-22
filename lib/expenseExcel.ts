import type { CreateExpenseInput, Expense } from '@/types'
import {
  formatExportDate,
  formatTextCellValue,
  parseExcelDate,
  parseExcelSheet,
  parseNumber,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'

export const EXPENSE_HEADERS = [
  'NO',
  'Tool Name',
  'Invoice Date',
  'Card Used',
  'Card Owner',
  'Amount',
  'Currency',
] as const

export const EXPENSE_TABLE_COLUMNS = EXPENSE_HEADERS

const HEADER_TO_FIELD: Record<string, keyof CreateExpenseInput> = {
  'tool name': 'toolName',
  'invoice date': 'invoiceDate',
  'card used': 'cardUsed',
  'card owner': 'cardOwner',
  amount: 'amount',
  currency: 'currency',
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

function resolveField(header: string): keyof CreateExpenseInput | null {
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

  if (normalized.includes('tool') && normalized.includes('name')) return 'toolName'
  if (normalized.includes('invoice') && normalized.includes('date')) return 'invoiceDate'
  if (normalized.includes('card') && normalized.includes('used')) return 'cardUsed'
  if (normalized.includes('card') && normalized.includes('owner')) return 'cardOwner'
  if (normalized === 'amount') return 'amount'
  if (normalized === 'currency') return 'currency'

  return null
}

function emptyRecord(): CreateExpenseInput {
  return {
    toolName: '',
    invoiceDate: '',
    cardUsed: '',
    cardOwner: '',
    amount: 0,
    currency: 'USD',
  }
}

function assignField(record: CreateExpenseInput, field: keyof CreateExpenseInput, value: unknown) {
  if (value === null || value === undefined || value === '') return

  if (field === 'amount') {
    record[field] = parseNumber(value)
    return
  }

  if (field === 'invoiceDate') {
    const parsed = parseExcelDate(value)
    if (parsed) record[field] = parsed
    return
  }

  const text = formatTextCellValue(value)
  if (text) record[field] = text
}

export async function parseExpensesExcel(file: File) {
  const records = await parseExcelSheet({
    file,
    resolveField,
    emptyRecord,
    assignField,
  })

  return { records, importedCount: records.length }
}

export function exportExpensesExcel(expenses: Expense[]) {
  const rows = expenses.map((expense, index) => ({
    NO: index + 1,
    'Tool Name': expense.toolName ?? '',
    'Invoice Date': formatExportDate(expense.invoiceDate),
    'Card Used': expense.cardUsed ?? '',
    'Card Owner': expense.cardOwner ?? '',
    Amount: expense.amount ?? 0,
    Currency: expense.currency ?? 'USD',
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Expenses', EXPENSE_HEADERS, rows, `expenses-${timestamp}.xlsx`)
}

export function downloadExpenseTemplate() {
  downloadExcelTemplate('Expenses', EXPENSE_HEADERS, 'expenses-sample.xlsx')
}
