import * as XLSX from 'xlsx'

const EXCEL_EXTENSIONS = ['.xlsx', '.xls']

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

export function isExcelFile(file: File) {
  const name = file.name.toLowerCase()
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]/g, '')
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cellDisplayValue(cell: XLSX.CellObject | undefined): unknown {
  if (!cell) return ''
  if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== '') {
    return cell.w
  }
  if (cell.v !== undefined && cell.v !== null) return cell.v
  return ''
}

function normalizeYear(year: number): number {
  if (year >= 100) return year
  return year >= 50 ? 1900 + year : 2000 + year
}

function monthIndex(name: string): number | undefined {
  const key = name.toLowerCase().replace(/\./g, '').trim()
  return MONTH_NAMES[key] ?? MONTH_NAMES[key.slice(0, 3)]
}

export function toIsoDate(year: number, month: number, day: number): string {
  const y = normalizeYear(year)
  const date = new Date(y, month, day)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return ''
  }
  return `${String(y).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function cleanDateText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[,;]+$/g, '')
    .trim()
}

function parseNamedMonthDate(value: string): string {
  const patterns = [
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z.]+)\s*'?(\d{2,4})$/i,
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z.]+)\s+(\d{2,4})$/i,
    /^([A-Za-z.]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})$/i,
    /^(\d{1,2})(?:st|nd|rd|th)?[-\s]([A-Za-z.]+)[-\s](\d{2,4})$/i,
  ]

  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (!match) continue

    let day: number
    let monthName: string
    let year: number

    if (/^[A-Za-z]/.test(match[1])) {
      monthName = match[1]
      day = Number(match[2])
      year = Number(match[3])
    } else {
      day = Number(match[1])
      monthName = match[2]
      year = Number(match[3])
    }

    const month = monthIndex(monthName)
    if (month === undefined) continue

    const iso = toIsoDate(year, month, day)
    if (iso) return iso
  }

  return ''
}

function parseNumericDateParts(first: number, second: number, year: number): string {
  const y = normalizeYear(year)

  if (first > 31 || second > 31) return ''

  if (first > 12 && second <= 12) {
    return toIsoDate(y, second - 1, first)
  }

  if (second > 12 && first <= 12) {
    return toIsoDate(y, first - 1, second)
  }

  if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
    return toIsoDate(y, second - 1, first)
  }

  return ''
}

function parseSeparatedDate(value: string): string {
  const isoMatch = value.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (isoMatch) {
    return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  }

  const partsMatch = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)
  if (partsMatch) {
    return parseNumericDateParts(
      Number(partsMatch[1]),
      Number(partsMatch[2]),
      Number(partsMatch[3]),
    )
  }

  return ''
}

function parseExcelSerial(value: number): string {
  if (!Number.isFinite(value)) return ''

  const dateParts = XLSX.SSF.parse_date_code(value)
  if (dateParts) {
    return toIsoDate(dateParts.y, dateParts.m - 1, dateParts.d)
  }

  return ''
}

export function parseExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value.getFullYear(), value.getMonth(), value.getDate())
  }

  if (typeof value === 'number') {
    return parseExcelSerial(value)
  }

  let trimmed = cleanDateText(String(value))
  if (!trimmed) return ''

  trimmed = trimmed.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i, '')

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  const named = parseNamedMonthDate(trimmed)
  if (named) return named

  const separated = parseSeparatedDate(trimmed)
  if (separated) return separated

  const looseNumber = Number(trimmed)
  if (!Number.isNaN(looseNumber) && /^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = parseExcelSerial(looseNumber)
    if (serial) return serial
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  return ''
}

function parseCurrencyString(raw: string): number {
  let text = raw.trim()
  if (!text || !/\d/.test(text)) return 0

  const negative = /^\(.*\)$/.test(text) || text.startsWith('-')
  text = text.replace(/[()]/g, '').replace(/^-/g, '')

  text = text.replace(/^(USD|EUR|GBP|INR|CAD|AUD|SGD|AED)\s*/i, '')
  text = text.replace(/\s*(USD|EUR|GBP|INR|CAD|AUD|SGD|AED)$/i, '')
  text = text.replace(/[$€£₹¥₩₽]/g, '')
  text = text.replace(/\s/g, '')

  const european =
    /^\d{1,3}(\.\d{3})+,\d+$/.test(text) ||
    (/,\d{1,2}$/.test(text) && text.includes('.'))
  if (european) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else {
    text = text.replace(/,/g, '')
  }

  const direct = Number(text)
  if (!Number.isNaN(direct)) {
    return negative ? -Math.abs(direct) : direct
  }

  const extracted = text.match(/-?\d+(?:\.\d+)?/)
  if (!extracted) return 0

  const parsed = Number(extracted[0])
  if (Number.isNaN(parsed)) return 0
  return negative ? -Math.abs(parsed) : parsed
}

export function parseNumber(value: unknown) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value

  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const numericChunk = raw.match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!numericChunk) return 0

  return parseCurrencyString(numericChunk[0])
}

export function parseInteger(value: unknown) {
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value)
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const match = raw.match(/\d+/)
  if (!match) return 0
  return Number(match[0])
}

export async function readExcelRows(file: File) {
  if (!isExcelFile(file)) {
    throw new Error('Only Excel files (.xlsx, .xls) are supported')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('The Excel file has no worksheets')
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: '' },
  )

  if (rows.length === 0) {
    throw new Error('The Excel file has no data rows')
  }

  return rows
}

export function hasRowData(row: Record<string, unknown>) {
  return Object.values(row).some((value) => String(value ?? '').trim() !== '')
}

export function writeExcelFile(
  sheetName: string,
  headers: readonly string[],
  rows: Record<string, string | number>[],
  filename: string,
) {
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: [...headers] })
      : XLSX.utils.aoa_to_sheet([[...headers]])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}
