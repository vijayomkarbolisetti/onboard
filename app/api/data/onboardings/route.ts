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
    const body = (await request.json()) as CreateOnboardingInput
    const record = await store.create(authResult.orgId, body)
    return NextResponse.json({ record })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
