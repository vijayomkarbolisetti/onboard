import type { CreateExpenseInput, Expense } from '@/types'
import {
  hasRowData,
  normalizeHeader,
  parseExcelDate,
  parseNumber,
  readExcelRows,
  writeExcelFile,
} from '@/lib/excelUtils'

export const EXPENSE_HEADERS = [
  'Tool Name',
  'Invoice Date',
  'Card Used',
  'Card Owner',
  'Amount',
  'Currency',
] as const

const HEADER_TO_FIELD: Record<string, keyof CreateExpenseInput> = {
  'tool name': 'toolName',
  'invoice date': 'invoiceDate',
  'card used': 'cardUsed',
  'card owner': 'cardOwner',
  amount: 'amount',
  currency: 'currency',
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

function rowToRecord(row: Record<string, unknown>): CreateExpenseInput {
  const record = emptyRecord()

  for (const [header, value] of Object.entries(row)) {
    const field = HEADER_TO_FIELD[normalizeHeader(header)]
    if (!field) continue

    if (field === 'amount') {
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

export async function parseExpensesExcel(file: File) {
  const rows = await readExcelRows(file)
  const records = rows.filter(hasRowData).map(rowToRecord)

  if (records.length === 0) {
    throw new Error('No valid rows found in the Excel file')
  }

  return { records, importedCount: records.length }
}

export function exportExpensesExcel(expenses: Expense[]) {
  const rows = expenses.map((expense) => ({
    'Tool Name': expense.toolName,
    'Invoice Date': expense.invoiceDate?.slice(0, 10) ?? '',
    'Card Used': expense.cardUsed,
    'Card Owner': expense.cardOwner,
    Amount: expense.amount,
    Currency: expense.currency,
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Expenses', EXPENSE_HEADERS, rows, `expenses-${timestamp}.xlsx`)
}
