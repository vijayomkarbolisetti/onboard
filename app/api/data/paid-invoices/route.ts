import { NextResponse } from 'next/server'
import { createOrgFirestoreStore } from '@/lib/orgFirestore'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import type { CreatePaidInvoiceInput, PaidInvoice } from '@/types'
import { normalizePaidInvoice } from '@/utils/format'

const store = createOrgFirestoreStore<PaidInvoice>('paid_invoices')

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const records = (await store.list(authResult.orgId)).map(normalizePaidInvoice)
    return NextResponse.json({ records })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load paid invoices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const body = (await request.json()) as
      | CreatePaidInvoiceInput
      | { records: CreatePaidInvoiceInput[] }

    if ('records' in body && Array.isArray(body.records)) {
      const records = await store.createMany(authResult.orgId, body.records)
      return NextResponse.json({ records })
    }

    const record = await store.create(authResult.orgId, body as CreatePaidInvoiceInput)
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save paid invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
