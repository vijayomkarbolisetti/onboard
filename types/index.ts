export type OnboardingStatus = 'pending' | 'in_progress' | 'completed'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'
export type SaasMspAgreement = 'SaaS' | 'MSP'

export interface Onboarding {
  id: string
  organizationId?: string
  organization: string
  onboardingDate: string
  endDate: string
  campaignLaunchDate: string
  targetedLeads: number
  interestedLeads: number
  totalReplies: number
  status: string
  remark: string
  createdAt: string
}

export interface OnboardingInvoiceRecord {
  id: string
  organizationId?: string
  companyName: string
  saasMspAgreement: SaasMspAgreement
  sponsor: string
  partnerProgram: string
  pointOfContact: string
  personEmailId: string
  onBoardDate: string
  invoiceAmount: number
  firstInvoiceDate: string
  invoiceCycle: string
  invoicesGenerated: number
  invoicesPaid: number
  nextInvoiceStatus: string
  createdAt: string
}

export interface Invoice {
  id: string
  onboardingId: string
  organization: string
  invoiceNumber: string
  amount: number
  status: InvoiceStatus
  dueDate: string
  issuedDate: string
  description: string
  createdAt: string
}

export interface CreateOnboardingInput {
  organization: string
  onboardingDate: string
  endDate: string
  campaignLaunchDate: string
  targetedLeads: number
  interestedLeads: number
  totalReplies: number
  status: string
  remark: string
}

export interface CreateOnboardingInvoiceInput {
  companyName: string
  saasMspAgreement: SaasMspAgreement
  sponsor: string
  partnerProgram: string
  pointOfContact: string
  personEmailId: string
  onBoardDate: string
  invoiceAmount: number
  firstInvoiceDate: string
  invoiceCycle: string
  invoicesGenerated: number
  invoicesPaid: number
  nextInvoiceStatus: string
}

export interface PaidInvoice {
  id: string
  organizationId?: string
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: number
  status: string
  paymentDate: string
  paymentMethod: string
  createdAt: string
}

export interface OpenInvoice {
  id: string
  organizationId?: string
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: number
  status: string
  notes: string
  createdAt: string
}

export interface CreatePaidInvoiceInput {
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: number
  status: string
  paymentDate: string
  paymentMethod: string
}

export interface CreateOpenInvoiceInput {
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: number
  status: string
  notes: string
}

export interface Expense {
  id: string
  organizationId?: string
  toolName: string
  invoiceDate: string
  cardUsed: string
  cardOwner: string
  amount: number
  currency: string
  createdAt: string
}

export interface CreateExpenseInput {
  toolName: string
  invoiceDate: string
  cardUsed: string
  cardOwner: string
  amount: number
  currency: string
}

export interface CreateInvoiceInput {
  onboardingId: string
  organization: string
  invoiceNumber: string
  amount: number
  status: InvoiceStatus
  dueDate: string
  issuedDate: string
  description: string
}

export type TabId =
  | 'onboarding'
  | 'onboarding-invoices'
  | 'paid-invoices'
  | 'open-invoices'
  | 'expenses'
  | 'team'
