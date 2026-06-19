import * as XLSX from 'xlsx'

const EXCEL_EXTENSIONS = ['.xlsx', '.xls']

export function isExcelFile(file: File) {
  const name = file.name.toLowerCase()
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function parseNumber(value: unknown) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isNaN(parsed) ? 0 : parsed
}

export function parseExcelDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return ''
  }
  if (typeof value === 'number') {
    const dateParts = XLSX.SSF.parse_date_code(value)
    if (dateParts) {
      const date = new Date(dateParts.y, dateParts.m - 1, dateParts.d)
      return date.toISOString().slice(0, 10)
    }
  }
  return ''
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
