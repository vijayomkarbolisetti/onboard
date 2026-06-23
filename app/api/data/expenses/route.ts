import { NextResponse } from 'next/server'
import { createOrgFirestoreStore } from '@/lib/orgFirestore'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import type { CreateExpenseInput, Expense } from '@/types'

const store = createOrgFirestoreStore<Expense>('expenses')

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const records = await store.list(authResult.orgId)
    return NextResponse.json({ records })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load expenses'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const body = (await request.json()) as CreateExpenseInput | { records: CreateExpenseInput[] }

    if ('records' in body && Array.isArray(body.records)) {
      const records = await store.createMany(authResult.orgId, body.records)
      return NextResponse.json({ records })
    }

    const record = await store.create(authResult.orgId, body as CreateExpenseInput)
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save expense'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
