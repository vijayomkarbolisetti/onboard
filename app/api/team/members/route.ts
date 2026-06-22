import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const client = await clerkClient()
    const { data } = await client.organizations.getOrganizationMembershipList({
      organizationId: authResult.orgId,
      limit: 100,
    })

    const members = data.map((membership) => ({
      id: membership.id,
      userId: membership.publicUserData?.userId ?? membership.publicUserData?.identifier,
      firstName: membership.publicUserData?.firstName ?? '',
      lastName: membership.publicUserData?.lastName ?? '',
      imageUrl: membership.publicUserData?.imageUrl ?? '',
      identifier:
        membership.publicUserData?.identifier ??
        membership.publicUserData?.userId ??
        'Unknown user',
      role: membership.role,
    }))

    return NextResponse.json({ members })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load team members'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
