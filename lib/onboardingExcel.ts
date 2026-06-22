import type { Onboarding } from '@/types'
import { formatExportDate, writeExcelFile, downloadExcelTemplate } from '@/lib/excelUtils'

export const ONBOARDING_HEADERS = [
  'S.No',
  'Organization',
  'No.of AI SDRs',
  'Onboarding Date',
  'End Date',
  'Comitted Amount',
  'Paid Amount',
  '1st campaign Launch date',
  'no.of campaigns',
  'Targeted Leads',
  'Contacted Leads',
  'Interested Leads',
  'Total Replies',
  'Status',
  'Remark',
] as const

export function exportOnboardingsExcel(onboardings: Onboarding[]) {
  const rows = onboardings.map((item, index) => ({
    'S.No': index + 1,
    Organization: item.organization ?? '',
    'No.of AI SDRs': item.noOfAiSdrs ?? 0,
    'Onboarding Date': formatExportDate(item.onboardingDate),
    'End Date': formatExportDate(item.endDate),
    'Comitted Amount': item.committedAmount ?? 0,
    'Paid Amount': item.paidAmount ?? 0,
    '1st campaign Launch date': formatExportDate(item.campaignLaunchDate),
    'no.of campaigns': item.noOfCampaigns ?? 0,
    'Targeted Leads': item.targetedLeads ?? 0,
    'Contacted Leads': item.contactedLeads ?? 0,
    'Interested Leads': item.interestedLeads ?? 0,
    'Total Replies': item.totalReplies ?? 0,
    Status: item.status ?? '',
    Remark: item.remark ?? '',
  }))

  const timestamp = new Date().toISOString().slice(0, 10)
  writeExcelFile('Client Tracker', ONBOARDING_HEADERS, rows, `client-tracker-${timestamp}.xlsx`)
}

export function downloadOnboardingTemplate() {
  downloadExcelTemplate('Client Tracker', ONBOARDING_HEADERS, 'client-tracker-sample.xlsx')
}
