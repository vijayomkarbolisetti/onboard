import * as XLSX from 'xlsx-js-style'
import { format } from 'date-fns'
import {
  autoFitWorksheetColumns,
  formatExportDate,
} from '@/lib/excelUtils'
import {
  clientsByMonth,
  clientStatusSlices,
  displayCurrencyForFilter,
  expenseTotals,
  expensesByMonth,
  expensesByTool,
  forecastNextMonths,
  invoiceStatsByMonth,
  invoiceTotals,
  recordCurrency,
  toAmount,
  type ExpenseMonthStats,
  type ForecastMonth,
  type InvoiceMonthStats,
  type MonthBucket,
  type StatusSlice,
} from '@/lib/dashboardAnalytics'
import type {
  Expense,
  Onboarding,
  OnboardingInvoiceRecord,
  OpenInvoice,
  PaidInvoice,
} from '@/types'

type CellStyle = NonNullable<XLSX.CellObject['s']>

const COLORS = {
  brand: '241F5B',
  aqua: '1FCC9A',
  headerBg: '241F5B',
  headerFg: 'FFFFFF',
  sectionBg: 'E8F8F3',
  altRow: 'F7F6FB',
  border: 'D8D5E8',
  muted: '5C5A78',
  kpiLabel: '241F5B',
}

const thinBorder = {
  top: { style: 'thin' as const, color: { rgb: COLORS.border } },
  bottom: { style: 'thin' as const, color: { rgb: COLORS.border } },
  left: { style: 'thin' as const, color: { rgb: COLORS.border } },
  right: { style: 'thin' as const, color: { rgb: COLORS.border } },
}

const titleStyle: CellStyle = {
  font: { bold: true, sz: 16, color: { rgb: COLORS.headerFg } },
  fill: { patternType: 'solid', fgColor: { rgb: COLORS.brand } },
  alignment: { vertical: 'center', horizontal: 'left' },
}

const subtitleStyle: CellStyle = {
  font: { sz: 10, color: { rgb: 'D8D5E8' } },
  fill: { patternType: 'solid', fgColor: { rgb: COLORS.brand } },
  alignment: { vertical: 'center' },
}

const sectionStyle: CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: COLORS.brand } },
  fill: { patternType: 'solid', fgColor: { rgb: COLORS.sectionBg } },
  alignment: { vertical: 'center' },
}

const headerStyle: CellStyle = {
  font: { bold: true, sz: 10, color: { rgb: COLORS.headerFg } },
  fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerBg } },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  border: thinBorder,
}

const labelStyle: CellStyle = {
  font: { bold: true, sz: 10, color: { rgb: COLORS.kpiLabel } },
  alignment: { vertical: 'center' },
  border: thinBorder,
}

const valueStyle: CellStyle = {
  font: { sz: 10 },
  alignment: { vertical: 'center', horizontal: 'right' },
  border: thinBorder,
  numFmt: '#,##0.00',
}

const countStyle: CellStyle = {
  font: { sz: 10 },
  alignment: { vertical: 'center', horizontal: 'right' },
  border: thinBorder,
  numFmt: '#,##0',
}

const textStyle: CellStyle = {
  font: { sz: 10 },
  alignment: { vertical: 'center' },
  border: thinBorder,
}

const mutedStyle: CellStyle = {
  font: { sz: 9, color: { rgb: COLORS.muted }, italic: true },
  alignment: { vertical: 'center' },
}

function setCell(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  value: string | number,
  style?: CellStyle,
) {
  const address = XLSX.utils.encode_cell({ r: row, c: col })
  const isNumber = typeof value === 'number' && Number.isFinite(value)
  ws[address] = {
    t: isNumber ? 'n' : 's',
    v: isNumber ? value : String(value),
    s: style,
  }
}

function styleDataSheet(
  worksheet: XLSX.WorkSheet,
  options?: { moneyCols?: number[]; countCols?: number[]; headerRow?: number },
) {
  if (!worksheet['!ref']) return

  const range = XLSX.utils.decode_range(worksheet['!ref'])
  const headerRow = options?.headerRow ?? 0
  const moneyCols = new Set(options?.moneyCols ?? [])
  const countCols = new Set(options?.countCols ?? [])

  for (let col = range.s.c; col <= range.e.c; col++) {
    const address = XLSX.utils.encode_cell({ r: headerRow, c: col })
    const cell = worksheet[address]
    if (!cell) continue
    cell.s = { ...(cell.s ?? {}), ...headerStyle }
  }

  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const alt = (row - headerRow) % 2 === 0
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[address]
      if (!cell) continue

      let base: CellStyle = textStyle
      if (moneyCols.has(col) && typeof cell.v === 'number') base = valueStyle
      else if (countCols.has(col) && typeof cell.v === 'number') base = countStyle

      cell.s = {
        ...base,
        fill: alt
          ? { patternType: 'solid', fgColor: { rgb: COLORS.altRow } }
          : { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        border: thinBorder,
      }
    }
  }

  worksheet['!views'] = [
    { state: 'frozen', xSplit: 0, ySplit: headerRow + 1, topLeftCell: `A${headerRow + 2}`, activePane: 'bottomLeft' },
  ]
  autoFitWorksheetColumns(worksheet, { minWidth: 12, maxWidth: 42, padding: 3 })
}

function sheetFromRows(
  headers: string[],
  rows: Record<string, string | number>[],
  options?: { moneyCols?: number[]; countCols?: number[] },
): XLSX.WorkSheet {
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers])
  styleDataSheet(worksheet, options)
  return worksheet
}

function buildSummarySheet(input: {
  currencyLabel: string
  clientCount: number
  clientAmount: number
  invoiceSummary: ReturnType<typeof invoiceTotals>
  expenseSummary: ReturnType<typeof expenseTotals>
}): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const generatedAt = format(new Date(), 'dd MMM yyyy, HH:mm')

  // Title banner
  setCell(ws, 0, 0, 'Wyra Client Tracker — Dashboard Report', titleStyle)
  setCell(ws, 0, 1, '', titleStyle)
  setCell(ws, 0, 2, '', titleStyle)
  setCell(ws, 1, 0, `Generated ${generatedAt}`, subtitleStyle)
  setCell(ws, 1, 1, '', subtitleStyle)
  setCell(ws, 1, 2, '', subtitleStyle)

  // KPI section
  setCell(ws, 3, 0, 'Key metrics', sectionStyle)
  setCell(ws, 3, 1, '', sectionStyle)
  setCell(ws, 3, 2, '', sectionStyle)

  setCell(ws, 4, 0, 'Metric', headerStyle)
  setCell(ws, 4, 1, 'Count', headerStyle)
  setCell(ws, 4, 2, `Amount (${input.currencyLabel})`, headerStyle)

  const kpis: Array<[string, number, number]> = [
    ['Total clients (filtered)', input.clientCount, input.clientAmount],
    ['Invoices raised', input.invoiceSummary.raisedCount, input.invoiceSummary.raisedAmount],
    ['Paid invoices', input.invoiceSummary.paidCount, input.invoiceSummary.paidAmount],
    ['Pending invoices', input.invoiceSummary.pendingCount, input.invoiceSummary.pendingAmount],
    ['Expenses', input.expenseSummary.count, input.expenseSummary.amount],
  ]

  kpis.forEach(([label, count, amount], index) => {
    const row = 5 + index
    const alt = index % 2 === 1
    const fill = alt
      ? { patternType: 'solid' as const, fgColor: { rgb: COLORS.altRow } }
      : { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } }
    setCell(ws, row, 0, label, { ...labelStyle, fill })
    setCell(ws, row, 1, count, { ...countStyle, fill })
    setCell(ws, row, 2, Number(amount.toFixed(2)), { ...valueStyle, fill })
  })

  // Applied filters section removed — not needed in the Excel export.

  setCell(
    ws,
    11,
    0,
    'Tip: Use the other sheets for status, monthly trends, forecast, and line-item detail.',
    mutedStyle,
  )
  setCell(ws, 11, 1, '', mutedStyle)
  setCell(ws, 11, 2, '', mutedStyle)

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 2 } },
  ]

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 11, c: 2 } })
  ws['!rows'] = [{ hpt: 28 }, { hpt: 18 }, {}, { hpt: 22 }, { hpt: 20 }]
  ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }]
  return ws
}

export function downloadDashboardReport(input: {
  onboardings: Onboarding[]
  onboardingInvoices: OnboardingInvoiceRecord[]
  paid: PaidInvoice[]
  open: OpenInvoice[]
  expenses: Expense[]
  clientMonthFilter: string
  clientYearFilter: string
  invoiceMonthFilter: string
  invoiceYearFilter: string
  expenseMonthFilter: string
  expenseYearFilter: string
  currencyFilter: string
  statusSlices: StatusSlice[]
  clientMonths: MonthBucket[]
  invoiceMonths: InvoiceMonthStats[]
  expenseMonths: ExpenseMonthStats[]
  expenseTools: StatusSlice[]
  forecast: ForecastMonth[]
  invoiceSummary: ReturnType<typeof invoiceTotals>
  expenseSummary: ReturnType<typeof expenseTotals>
}) {
  const {
    onboardings,
    paid,
    open,
    expenses,
    clientMonthFilter,
    clientYearFilter,
    invoiceMonthFilter,
    invoiceYearFilter,
    expenseMonthFilter,
    expenseYearFilter,
    currencyFilter,
    statusSlices,
    clientMonths,
    invoiceMonths,
    expenseMonths,
    expenseTools,
    forecast,
    invoiceSummary,
    expenseSummary,
  } = input

  const currencyLabel = displayCurrencyForFilter(currencyFilter)
  const workbook = XLSX.utils.book_new()

  const clientCount =
    clientMonths.reduce((s, m) => s + m.count, 0) || onboardings.length
  const clientAmount = clientMonths.reduce((s, m) => s + m.amount, 0)

  XLSX.utils.book_append_sheet(
    workbook,
    buildSummarySheet({
      currencyLabel,
      clientCount,
      clientAmount,
      invoiceSummary,
      expenseSummary,
    }),
    'Summary',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      ['Status', 'Clients', `Committed (${currencyLabel})`],
      statusSlices.map((s) => ({
        Status: s.name,
        Clients: s.value,
        [`Committed (${currencyLabel})`]: Number(s.amount.toFixed(2)),
      })),
      { countCols: [1], moneyCols: [2] },
    ),
    'Clients by Status',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      ['Month', 'New Clients', `Committed (${currencyLabel})`],
      clientMonths.map((m) => ({
        Month: m.label,
        'New Clients': m.count,
        [`Committed (${currencyLabel})`]: Number(m.amount.toFixed(2)),
      })),
      { countCols: [1], moneyCols: [2] },
    ),
    'Clients by Month',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        'Month',
        'Raised Count',
        `Raised (${currencyLabel})`,
        'Paid Count',
        `Paid (${currencyLabel})`,
        'Pending Count',
        `Pending (${currencyLabel})`,
      ],
      invoiceMonths.map((m) => ({
        Month: m.label,
        'Raised Count': m.raisedCount,
        [`Raised (${currencyLabel})`]: Number(m.raisedAmount.toFixed(2)),
        'Paid Count': m.paidCount,
        [`Paid (${currencyLabel})`]: Number(m.paidAmount.toFixed(2)),
        'Pending Count': m.pendingCount,
        [`Pending (${currencyLabel})`]: Number(m.pendingAmount.toFixed(2)),
      })),
      { countCols: [1, 3, 5], moneyCols: [2, 4, 6] },
    ),
    'Invoices by Month',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        'Month',
        'Forecast Raised Count',
        `Forecast Raised (${currencyLabel})`,
        'Forecast Paid Count',
        `Forecast Paid (${currencyLabel})`,
        'Forecast Pending Count',
        `Forecast Pending (${currencyLabel})`,
      ],
      forecast.map((m) => ({
        Month: m.label,
        'Forecast Raised Count': m.raisedCount,
        [`Forecast Raised (${currencyLabel})`]: Number(m.raisedAmount.toFixed(2)),
        'Forecast Paid Count': m.paidCount,
        [`Forecast Paid (${currencyLabel})`]: Number(m.paidAmount.toFixed(2)),
        'Forecast Pending Count': m.pendingCount,
        [`Forecast Pending (${currencyLabel})`]: Number(m.pendingAmount.toFixed(2)),
      })),
      { countCols: [1, 3, 5], moneyCols: [2, 4, 6] },
    ),
    '6-Month Forecast',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        'Invoice Date',
        'Company',
        'Customer',
        'Invoice Number',
        'Amount',
        'Currency',
        'Status',
        'Payment Date',
        'Type',
      ],
      [
        ...paid.map((inv) => ({
          'Invoice Date': formatExportDate(inv.invoiceDate),
          Company: inv.companyName,
          Customer: inv.customerName,
          'Invoice Number': inv.invoiceNumber,
          Amount: toAmount(inv.invoiceAmount),
          Currency: recordCurrency(inv.currency, inv.invoiceAmount),
          Status: inv.status,
          'Payment Date': formatExportDate(inv.paymentDate),
          Type: 'Paid',
        })),
        ...open.map((inv) => ({
          'Invoice Date': formatExportDate(inv.invoiceDate),
          Company: inv.companyName,
          Customer: inv.customerName,
          'Invoice Number': inv.invoiceNumber,
          Amount: toAmount(inv.invoiceAmount),
          Currency: recordCurrency(inv.currency, inv.invoiceAmount),
          Status: inv.status,
          'Payment Date': '',
          Type: 'Pending',
        })),
      ],
      { moneyCols: [4] },
    ),
    'Invoice Detail',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      ['Tool', 'Expense Count', `Amount (${currencyLabel})`],
      expenseTools.map((t) => ({
        Tool: t.name,
        'Expense Count': t.value,
        [`Amount (${currencyLabel})`]: Number(t.amount.toFixed(2)),
      })),
      { countCols: [1], moneyCols: [2] },
    ),
    'Expenses by Tool',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      ['Month', 'Expense Count', `Amount (${currencyLabel})`],
      expenseMonths.map((m) => ({
        Month: m.label,
        'Expense Count': m.count,
        [`Amount (${currencyLabel})`]: Number(m.amount.toFixed(2)),
      })),
      { countCols: [1], moneyCols: [2] },
    ),
    'Expenses by Month',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      ['Invoice Date', 'Tool Name', 'Amount', 'Currency', 'Card Used', 'Card Owner'],
      expenses.map((row) => ({
        'Invoice Date': formatExportDate(row.invoiceDate),
        'Tool Name': row.toolName,
        Amount: toAmount(row.amount),
        Currency: recordCurrency(row.currency, row.amount),
        'Card Used': row.cardUsed ?? '',
        'Card Owner': row.cardOwner ?? '',
      })),
      { moneyCols: [2] },
    ),
    'Expense Detail',
  )

  const filename = `wyra-dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  XLSX.writeFile(workbook, filename)
}

/** Convenience recompute + download used by UI */
export function buildAndDownloadDashboardReport(args: {
  onboardings: Onboarding[]
  onboardingInvoices: OnboardingInvoiceRecord[]
  paid: PaidInvoice[]
  open: OpenInvoice[]
  expenses: Expense[]
  clientMonthFilter: string
  clientYearFilter: string
  invoiceMonthFilter: string
  invoiceYearFilter: string
  expenseMonthFilter: string
  expenseYearFilter: string
  currencyFilter: string
  rates?: import('@/lib/fx').FxRatesFromUsd | null
}) {
  const moneyOpts = {
    currencyFilter: args.currencyFilter || 'USD',
    rates: args.rates ?? null,
  }
  const statusSlices = clientStatusSlices(args.onboardings, moneyOpts)
  const clientMonths = clientsByMonth(
    args.onboardings,
    args.clientMonthFilter,
    args.clientYearFilter,
    moneyOpts,
  )
  const invoiceMonths = invoiceStatsByMonth(
    args.paid,
    args.open,
    args.invoiceMonthFilter,
    args.invoiceYearFilter,
    moneyOpts,
  )
  const invoiceSummary = invoiceTotals(
    args.paid,
    args.open,
    args.invoiceMonthFilter,
    args.invoiceYearFilter,
    moneyOpts,
  )
  const expenseSummary = expenseTotals(
    args.expenses,
    args.expenseMonthFilter,
    args.expenseYearFilter,
    moneyOpts,
  )
  const expenseMonths = expensesByMonth(
    args.expenses,
    args.expenseMonthFilter,
    args.expenseYearFilter,
    moneyOpts,
  )
  const expenseTools = expensesByTool(
    args.expenses,
    args.expenseMonthFilter,
    args.expenseYearFilter,
    moneyOpts,
  )
  const forecast = forecastNextMonths(args.onboardingInvoices, 3, new Date(), moneyOpts)

  downloadDashboardReport({
    ...args,
    currencyFilter: moneyOpts.currencyFilter,
    statusSlices,
    clientMonths,
    invoiceMonths,
    expenseMonths,
    expenseTools,
    forecast,
    invoiceSummary,
    expenseSummary,
  })
}

export function downloadInvoiceModalExcel(input: {
  title: string
  periodLabel: string
  displayCurrency: string
  summary: {
    raisedCount: number
    raisedAmount: number
    paidCount: number
    paidAmount: number
    pendingCount: number
    pendingAmount: number
  }
  rows: Array<{
    invoiceDate: string
    customerName: string
    companyName: string
    invoiceNumber: string
    type: 'Paid' | 'Pending'
    displayAmount: number
  }>
}) {
  const ws: XLSX.WorkSheet = {}
  const colCount = 6

  // Title + period (matches modal header)
  for (let c = 0; c < colCount; c++) {
    setCell(ws, 0, c, c === 0 ? input.title : '', titleStyle)
    setCell(ws, 1, c, c === 0 ? input.periodLabel : '', subtitleStyle)
  }
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: colCount - 1 } },
  ]

  // Summary section
  setCell(ws, 3, 0, 'Summary', sectionStyle)
  for (let c = 1; c < colCount; c++) setCell(ws, 3, c, '', sectionStyle)

  setCell(ws, 4, 0, 'Metric', headerStyle)
  setCell(ws, 4, 1, 'Count', headerStyle)
  setCell(ws, 4, 2, `Amount (${input.displayCurrency})`, headerStyle)
  for (let c = 3; c < colCount; c++) setCell(ws, 4, c, '', headerStyle)

  const summaryRows: Array<[string, number, number]> = [
    ['Total raised', input.summary.raisedCount, input.summary.raisedAmount],
    ['Total paid', input.summary.paidCount, input.summary.paidAmount],
    ['Total pending', input.summary.pendingCount, input.summary.pendingAmount],
  ]

  summaryRows.forEach(([label, count, amount], index) => {
    const row = 5 + index
    const alt = index % 2 === 1
    const fill = alt
      ? { patternType: 'solid' as const, fgColor: { rgb: COLORS.altRow } }
      : { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } }
    setCell(ws, row, 0, label, { ...labelStyle, fill })
    setCell(ws, row, 1, count, { ...countStyle, fill })
    setCell(ws, row, 2, Number(amount.toFixed(2)), { ...valueStyle, fill })
    for (let c = 3; c < colCount; c++) setCell(ws, row, c, '', { ...textStyle, fill })
  })

  setCell(
    ws,
    9,
    0,
    `Raised = paid + pending. Amounts are shown in ${input.displayCurrency}.`,
    mutedStyle,
  )
  for (let c = 1; c < colCount; c++) setCell(ws, 9, c, '', mutedStyle)

  // Detail table
  setCell(ws, 11, 0, 'Invoice details', sectionStyle)
  for (let c = 1; c < colCount; c++) setCell(ws, 11, c, '', sectionStyle)

  const detailHeaders = ['Date', 'Invoice Number', 'Customer', 'Company', 'Type', 'Amount']
  detailHeaders.forEach((header, col) => setCell(ws, 12, col, header, headerStyle))

  if (input.rows.length === 0) {
    setCell(ws, 13, 0, 'No invoices for this selection.', mutedStyle)
    for (let c = 1; c < colCount; c++) setCell(ws, 13, c, '', mutedStyle)
  } else {
    input.rows.forEach((row, index) => {
      const r = 13 + index
      const alt = index % 2 === 1
      const fill = alt
        ? { patternType: 'solid' as const, fgColor: { rgb: COLORS.altRow } }
        : { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } }
      setCell(ws, r, 0, formatExportDate(row.invoiceDate), { ...textStyle, fill })
      setCell(ws, r, 1, row.invoiceNumber || '—', { ...textStyle, fill })
      setCell(ws, r, 2, row.customerName || '—', { ...textStyle, fill })
      setCell(ws, r, 3, row.companyName || '—', { ...textStyle, fill })
      setCell(ws, r, 4, row.type, { ...textStyle, fill, alignment: { vertical: 'center', horizontal: 'right' } })
      setCell(ws, r, 5, Number(row.displayAmount.toFixed(2)), { ...valueStyle, fill })
    })
  }

  const lastRow = input.rows.length === 0 ? 13 : 12 + input.rows.length
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: colCount - 1 },
  })
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }]
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, ws, 'Invoice details')
  const stamp = format(new Date(), 'yyyy-MM-dd')
  const safeTitle = input.title.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  XLSX.writeFile(workbook, `${safeTitle || 'invoice-details'}-${stamp}.xlsx`)
}

export function downloadExpenseMonthToolsExcel(input: {
  monthLabel: string
  displayCurrency: string
  tools: Array<{ name: string; count: number; amount: number }>
}) {
  const ws: XLSX.WorkSheet = {}
  const colCount = 3
  const totalAmount = input.tools.reduce((s, t) => s + t.amount, 0)
  const totalRecords = input.tools.reduce((s, t) => s + t.count, 0)
  const title = `Tools used in ${input.monthLabel}`
  const subtitle = `${input.tools.length} different tools · ${totalRecords} records · ${input.displayCurrency}`

  for (let c = 0; c < colCount; c++) {
    setCell(ws, 0, c, c === 0 ? title : '', titleStyle)
    setCell(ws, 1, c, c === 0 ? subtitle : '', subtitleStyle)
  }
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ]

  setCell(ws, 3, 0, 'Summary', sectionStyle)
  setCell(ws, 3, 1, '', sectionStyle)
  setCell(ws, 3, 2, '', sectionStyle)

  setCell(ws, 4, 0, 'Metric', headerStyle)
  setCell(ws, 4, 1, 'Value', headerStyle)
  setCell(ws, 4, 2, '', headerStyle)

  const summaryRows: Array<[string, string | number]> = [
    ['Different tools', input.tools.length],
    ['Total records', totalRecords],
    [`Total amount (${input.displayCurrency})`, Number(totalAmount.toFixed(2))],
  ]
  summaryRows.forEach(([label, value], index) => {
    const row = 5 + index
    const alt = index % 2 === 1
    const fill = alt
      ? { patternType: 'solid' as const, fgColor: { rgb: COLORS.altRow } }
      : { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } }
    setCell(ws, row, 0, label, { ...labelStyle, fill })
    if (typeof value === 'number' && index === 2) {
      setCell(ws, row, 1, value, { ...valueStyle, fill })
    } else if (typeof value === 'number') {
      setCell(ws, row, 1, value, { ...countStyle, fill })
    } else {
      setCell(ws, row, 1, value, { ...textStyle, fill })
    }
    setCell(ws, row, 2, '', { ...textStyle, fill })
  })

  setCell(ws, 9, 0, 'Tools', sectionStyle)
  setCell(ws, 9, 1, '', sectionStyle)
  setCell(ws, 9, 2, '', sectionStyle)

  setCell(ws, 10, 0, 'Tool', headerStyle)
  setCell(ws, 10, 1, 'Records', headerStyle)
  setCell(ws, 10, 2, `Amount (${input.displayCurrency})`, headerStyle)

  if (input.tools.length === 0) {
    setCell(ws, 11, 0, 'No tools found for this month.', mutedStyle)
    setCell(ws, 11, 1, '', mutedStyle)
    setCell(ws, 11, 2, '', mutedStyle)
  } else {
    input.tools.forEach((tool, index) => {
      const r = 11 + index
      const alt = index % 2 === 1
      const fill = alt
        ? { patternType: 'solid' as const, fgColor: { rgb: COLORS.altRow } }
        : { patternType: 'solid' as const, fgColor: { rgb: 'FFFFFF' } }
      setCell(ws, r, 0, tool.name || '—', { ...textStyle, fill })
      setCell(ws, r, 1, tool.count, { ...countStyle, fill })
      setCell(ws, r, 2, Number(tool.amount.toFixed(2)), { ...valueStyle, fill })
    })
  }

  const lastRow = input.tools.length === 0 ? 11 : 10 + input.tools.length
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: colCount - 1 },
  })
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }]
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 18 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, ws, 'Tools by month')
  const stamp = format(new Date(), 'yyyy-MM-dd')
  const safeMonth = input.monthLabel.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  XLSX.writeFile(workbook, `tools-used-${safeMonth || 'month'}-${stamp}.xlsx`)
}
