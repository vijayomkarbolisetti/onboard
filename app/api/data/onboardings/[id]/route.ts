import { NextResponse } from 'next/server'
import { createOrgFirestoreStore } from '@/lib/orgFirestore'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import type { CreateOnboardingInput, Onboarding } from '@/types'

const store = createOrgFirestoreStore<Onboarding>('onboardings')

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  const { id } = await context.params

  try {
    const body = (await request.json()) as Partial<CreateOnboardingInput> & { status?: string }
    await store.update(authResult.orgId, id, body as CreateOnboardingInput)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  const { id } = await context.params

  try {
    await store.remove(authResult.orgId, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete onboarding'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
