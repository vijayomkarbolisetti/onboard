import type { CreateExpenseInput, Expense } from '@/types'
import {
  formatDocumentsForExport,
  formatExportDate,
  formatTextCellValue,
  parseExcelDate,
  parseExcelSheet,
  toExportNumber,
  writeExcelFile,
  downloadExcelTemplate,
} from '@/lib/excelUtils'
import { extractPdfText } from '@/lib/openInvoiceExcel'

export const EXPENSE_HEADERS = [
  'NO',
  'Tool Name',
  'Invoice Date',
  'Card Used',
  'Card Owner',
  'Amount',
  'Currency',
  'Documents',
] as const

export const EXPENSE_TABLE_COLUMNS = [
  'NO',
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
    amount: '',
    currency: 'USD',
  }
}

function assignField(record: CreateExpenseInput, field: keyof CreateExpenseInput, value: unknown) {
  if (value === null || value === undefined || value === '') return
  if (field === 'documents') return

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

/** Best-effort field suggestions from an uploaded expense file (Excel, PDF text, or filename). */
export async function suggestExpenseFromFile(
  file: File,
): Promise<Partial<CreateExpenseInput>> {
  const name = file.name.toLowerCase()
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf'

  if (isExcel) {
    try {
      const { records } = await parseExpensesExcel(file)
      const first = records[0]
      if (!first) return suggestExpenseFromFileName(file.name)
      const suggestion: Partial<CreateExpenseInput> = {}
      if (first.toolName) suggestion.toolName = first.toolName
      if (first.invoiceDate) suggestion.invoiceDate = first.invoiceDate
      if (first.cardUsed) suggestion.cardUsed = first.cardUsed
      if (first.cardOwner) suggestion.cardOwner = first.cardOwner
      if (first.amount) suggestion.amount = String(first.amount)
      if (first.currency) suggestion.currency = first.currency
      return Object.keys(suggestion).length > 0
        ? suggestion
        : suggestExpenseFromFileName(file.name)
    } catch {
      return suggestExpenseFromFileName(file.name)
    }
  }

  if (isPdf) {
    try {
      const text = await extractPdfText(file)
      const fromText = suggestExpenseFromText(text)
      if (Object.keys(fromText).length > 0) {
        return { ...suggestExpenseFromFileName(file.name), ...fromText }
      }
    } catch {
      // Fall through to filename heuristics
    }
  }

  return suggestExpenseFromFileName(file.name)
}

function suggestExpenseFromText(raw: string): Partial<CreateExpenseInput> {
  const text = raw.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!text) return {}

  const suggestion: Partial<CreateExpenseInput> = {}
  const compact = text.replace(/\n+/g, '\n')

  const amountMatch =
    compact.match(
      /(?:Amount\s*paid|Total\s*paid|Amount\s*due|Total\s*due|Grand\s*total|Total|Amount)\s*[:$]?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?)/i,
    ) || compact.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2}))/)
  if (amountMatch?.[1]) {
    suggestion.amount = amountMatch[1].replace(/,/g, '')
    if (/\$/.test(amountMatch[0]) || /USD/i.test(compact)) suggestion.currency = 'USD'
  }

  const currency = compact.match(/\b(USD|EUR|GBP|INR|AED|CAD|AUD)\b/i)?.[1]
  if (currency) suggestion.currency = currency.toUpperCase()

  const isoDate = compact.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (isoDate) {
    suggestion.invoiceDate = `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`
  } else {
    const named =
      compact.match(
        /\b(?:Date\s*paid|Invoice\s*date|Payment\s*date|Date)\s*[:-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2})/i,
      )?.[1] ||
      compact.match(
        /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2})\b/i,
      )?.[1]
    if (named) {
      const parsed = new Date(named)
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

  const cardUsed =
    compact.match(
      /\b((?:Visa|Mastercard|Master Card|Amex|American Express|Discover|Card)\s*(?:\*+|x+|X+)?\s*\d{3,4})\b/i,
    )?.[1] ||
    compact.match(/\b((?:Visa|Mastercard|Amex|Discover)\s+[•*]+\s*\d{4})\b/i)?.[1] ||
    compact.match(/Card\s*(?:used|ending|number)?\s*[:#]?\s*([^\n\r]{3,40})/i)?.[1]
  if (cardUsed) suggestion.cardUsed = cardUsed.replace(/\s+/g, ' ').trim()

  const cardOwner =
    compact.match(/Card\s*holder\s*(?:name)?\s*[:#]?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    compact.match(/Card\s*owner\s*[:#]?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    compact.match(/Bill\s*to\s*\n+\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    compact.match(/Bill\s*to\s*[:-]?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1]
  if (cardOwner) {
    const cleaned = cardOwner.split('\n')[0].trim()
    if (cleaned && !/^(invoice|receipt|amount|date|payment)/i.test(cleaned)) {
      suggestion.cardOwner = cleaned
    }
  }

  const toolName =
    compact.match(/^(?:Receipt|Invoice)\s+for\s+([^\n\r]{2,60})/im)?.[1] ||
    compact.match(/\b(?:Tool|Product|Service|Subscription|Plan|Merchant|Vendor)\s*(?:name)?\s*[:#]?\s*([^\n\r]{2,60})/i)?.[1] ||
    compact.match(/^([A-Za-z][A-Za-z0-9 .&+_-]{1,40})\s+Premium\b/im)?.[0] ||
    compact.match(/^([A-Za-z][A-Za-z0-9 .&+_-]{1,40})\s+(?:Invoice|Receipt)\b/im)?.[1]
  if (toolName) {
    const cleaned = toolName.replace(/\s+/g, ' ').trim()
    if (cleaned && !/^(receipt|invoice|amount|total|bill)/i.test(cleaned)) {
      suggestion.toolName = cleaned
    }
  }

  return suggestion
}

function suggestExpenseFromFileName(fileName: string): Partial<CreateExpenseInput> {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
  const suggestion: Partial<CreateExpenseInput> = {}

  const currency = base.match(/\b(USD|EUR|GBP|INR|AED|CAD|AUD)\b/i)?.[1]
  if (currency) suggestion.currency = currency.toUpperCase()

  const amount =
    base.match(/(?:USD|EUR|GBP|INR|AED|\$|€|£)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?)/i) ||
    base.match(/\b([0-9]{1,3}(?:,[0-9]{3})+\.\d{2})\b/)
  if (amount?.[1]) suggestion.amount = amount[1].replace(/,/g, '')

  const isoDate = base.match(/\b(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})\b/)
  if (isoDate) {
    suggestion.invoiceDate = `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`
  }

  const toolFromName = base
    .replace(/\breceipt\b/gi, ' ')
    .replace(/\binvoice\b/gi, ' ')
    .replace(/\b\d{3,}(?:-\d{3,})+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (toolFromName && toolFromName.length >= 2 && toolFromName.length <= 40) {
    suggestion.toolName = toolFromName
  }

  return suggestion
}

export async function exportExpensesExcel(expenses: Expense[]) {
  const rows = []
  for (let index = 0; index < expenses.length; index++) {
    const expense = expenses[index]
    rows.push({
      NO: index + 1,
      'Tool Name': expense.toolName ?? '',
      'Invoice Date': formatExportDate(expense.invoiceDate),
      'Card Used': expense.cardUsed ?? '',
      'Card Owner': expense.cardOwner ?? '',
      Amount: toExportNumber(expense.amount),
      Currency: expense.currency ?? 'USD',
      Documents: await formatDocumentsForExport(expense.documents),
    })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Expenses', EXPENSE_HEADERS, rows, `expenses-${timestamp}.xlsx`, {
    moneyHeaders: ['Amount'],
  })
}

export function downloadExpenseTemplate() {
  downloadExcelTemplate('Expenses', EXPENSE_HEADERS, 'expenses-sample.xlsx')
}
