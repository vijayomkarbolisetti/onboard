import { NextResponse } from 'next/server'
import { createOrgFirestoreStore } from '@/lib/orgFirestore'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import type { CreateOnboardingInput, Onboarding } from '@/types'

const store = createOrgFirestoreStore<Onboarding>('onboardings')

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const records = await store.list(authResult.orgId)
    return NextResponse.json({ records })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load onboardings'
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
      | CreateOnboardingInput
      | { records: CreateOnboardingInput[] }

    if ('records' in body && Array.isArray(body.records)) {
      const records = await store.createMany(authResult.orgId, body.records)
      return NextResponse.json({ records })
    }

    const record = await store.create(authResult.orgId, body as CreateOnboardingInput)
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
