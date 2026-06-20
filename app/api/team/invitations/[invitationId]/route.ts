import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

type RouteContext = {
  params: Promise<{ invitationId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  const { invitationId } = await context.params
  if (!invitationId) {
    return NextResponse.json({ error: 'Invitation id is required' }, { status: 400 })
  }

  try {
    const client = await clerkClient()
    await client.organizations.revokeOrganizationInvitation({
      organizationId: authResult.orgId,
      invitationId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to revoke invitation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
