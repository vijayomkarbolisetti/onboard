import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import { normalizeModuleAccess } from '@/lib/modulePermissions'
import { getStoredModuleAccess } from '@/lib/userModuleAccessStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

    const members = await Promise.all(
      data.map(async (membership) => {
        const userId = membership.publicUserData?.userId ?? ''
        const isAdmin = membership.role === 'org:admin'
        let rawAccess: unknown = null
        if (userId) {
          try {
            rawAccess = await getStoredModuleAccess(authResult.orgId, userId)
          } catch {
            rawAccess = null
          }
        }
        return {
          id: membership.id,
          userId,
          firstName: membership.publicUserData?.firstName ?? '',
          lastName: membership.publicUserData?.lastName ?? '',
          imageUrl: membership.publicUserData?.imageUrl ?? '',
          identifier:
            membership.publicUserData?.identifier ??
            membership.publicUserData?.userId ??
            'Unknown user',
          role: membership.role,
          moduleAccess: normalizeModuleAccess(rawAccess, isAdmin),
        }
      }),
    )

    return NextResponse.json({ members })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load team members'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
