import { NextResponse } from 'next/server'
import { createOrgFirestoreStore } from '@/lib/orgFirestore'
import { normalizeOnboardingInvoiceRecord } from '@/lib/onboardingInvoiceExcel'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import type { CreateOnboardingInvoiceInput, OnboardingInvoiceRecord } from '@/types'

const store = createOrgFirestoreStore<OnboardingInvoiceRecord>('onboarding_invoices')

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const records = (await store.list(authResult.orgId)).map(normalizeOnboardingInvoiceRecord)
    return NextResponse.json({ records })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load onboarding invoices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const body = (await request.json()) as
      | CreateOnboardingInvoiceInput
      | { records: CreateOnboardingInvoiceInput[] }

    if ('records' in body && Array.isArray(body.records)) {
      const records = (await store.createMany(authResult.orgId, body.records)).map(
        normalizeOnboardingInvoiceRecord,
      )
      return NextResponse.json({ records })
    }

    const record = normalizeOnboardingInvoiceRecord(
      await store.create(authResult.orgId, body as CreateOnboardingInvoiceInput),
    )
    return NextResponse.json({ record })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save onboarding invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
