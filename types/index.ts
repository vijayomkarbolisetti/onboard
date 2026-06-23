export type OnboardingStatus = 'pending' | 'in_progress' | 'completed'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'
export type SaasMspAgreement = 'SaaS' | 'MSP'

export interface Onboarding {
  id: string
  organizationId?: string
  organization: string
  committedMonths?: string | number
  agreementSignedDate?: string
  noOfAiSdrs?: string | number
  onboardingDate: string
  endDate: string
  committedAmount?: string | number
  paidAmount?: string | number
  campaignLaunchDate: string
  noOfCampaigns?: string | number
  targetedLeads?: string | number
  contactedLeads?: string | number
  interestedLeads?: string | number
  totalReplies?: string | number
  status: string
  remark: string
  createdAt: string
}

export interface OnboardingInvoiceRecord {
  id: string
  organizationId?: string
  companyName: string
  subscriptionSummary?: string
  agreementDocumentLink?: string
  saasMspAgreement: SaasMspAgreement
  sponsor: string
  partnerProgram: string
  pointOfContact: string
  personEmailId: string
  onBoardDate: string
  invoiceAmount: string | number
  firstInvoiceDate: string
  invoiceCycle: string
  invoicesGenerated: string | number
  invoicesPaid: string | number
  totalAmountPaid?: string | number
  pendingAmount?: string | number
  nextInvoiceStatus: string
  createdAt: string
}

export interface Invoice {
  id: string
  onboardingId: string
  organization: string
  invoiceNumber: string
  amount: string | number
  status: InvoiceStatus
  dueDate: string
  issuedDate: string
  description: string
  createdAt: string
}

export interface CreateOnboardingInput {
  organization: string
  committedMonths: string
  agreementSignedDate: string
  noOfAiSdrs: string
  onboardingDate: string
  endDate: string
  committedAmount: string
  paidAmount: string
  campaignLaunchDate: string
  noOfCampaigns: string
  targetedLeads: string
  contactedLeads: string
  interestedLeads: string
  totalReplies: string
  status: string
  remark: string
}

export interface CreateOnboardingInvoiceInput {
  companyName: string
  subscriptionSummary: string
  agreementDocumentLink: string
  saasMspAgreement: SaasMspAgreement
  sponsor: string
  partnerProgram: string
  pointOfContact: string
  personEmailId: string
  onBoardDate: string
  invoiceAmount: string
  firstInvoiceDate: string
  invoiceCycle: string
  invoicesGenerated: string
  invoicesPaid: string
  totalAmountPaid: string
  pendingAmount: string
  nextInvoiceStatus: string
}

export interface PaidInvoice {
  id: string
  organizationId?: string
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: string | number
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
  invoiceAmount: string | number
  status: string
  notes: string
  createdAt: string
}

export interface CreatePaidInvoiceInput {
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: string
  status: string
  paymentDate: string
  paymentMethod: string
}

export interface CreateOpenInvoiceInput {
  invoiceDate: string
  customerName: string
  companyName: string
  invoiceNumber: string
  invoiceAmount: string
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
  amount: string | number
  currency: string
  createdAt: string
}

export interface CreateExpenseInput {
  toolName: string
  invoiceDate: string
  cardUsed: string
  cardOwner: string
  amount: string
  currency: string
}

export interface CreateInvoiceInput {
  onboardingId: string
  organization: string
  invoiceNumber: string
  amount: string
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
