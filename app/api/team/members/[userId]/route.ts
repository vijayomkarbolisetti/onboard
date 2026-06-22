import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  const { userId } = await context.params
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  if (userId === authResult.userId) {
    return NextResponse.json(
      { error: 'You cannot remove yourself from the organization.' },
      { status: 400 },
    )
  }

  try {
    const client = await clerkClient()
    await client.organizations.deleteOrganizationMembership({
      organizationId: authResult.orgId,
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
