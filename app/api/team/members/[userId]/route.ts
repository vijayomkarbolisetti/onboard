import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'
import { normalizeModuleAccess, toStoredModuleAccess } from '@/lib/modulePermissions'
import {
  getStoredModuleAccess,
  upsertStoredModuleAccess,
} from '@/lib/userModuleAccessStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
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
      { error: 'You cannot change your own role or permissions. Ask another admin.' },
      { status: 400 },
    )
  }

  let body: { role?: string; moduleAccess?: unknown }
  try {
    body = (await request.json()) as { role?: string; moduleAccess?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const role =
    body.role === 'org:admin' ? 'org:admin' : body.role === 'org:member' ? 'org:member' : undefined
  const hasModuleAccess = Object.prototype.hasOwnProperty.call(body, 'moduleAccess')

  try {
    const client = await clerkClient()
    let membershipRole: string | null = null

    if (role != null) {
      const membership = await client.organizations.updateOrganizationMembership({
        organizationId: authResult.orgId,
        userId,
        role,
      })
      membershipRole = membership.role
    } else {
      const { data } = await client.organizations.getOrganizationMembershipList({
        organizationId: authResult.orgId,
        userId: [userId],
        limit: 1,
      })
      membershipRole = data[0]?.role ?? null
      if (!membershipRole) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }
    }

    const isAdmin = membershipRole === 'org:admin'
    let moduleAccess = normalizeModuleAccess(
      await getStoredModuleAccess(authResult.orgId, userId).catch(() => null),
      isAdmin,
    )

    if (hasModuleAccess && !isAdmin) {
      moduleAccess = await upsertStoredModuleAccess({
        orgId: authResult.orgId,
        userId,
        moduleAccess: toStoredModuleAccess(body.moduleAccess),
        updatedBy: authResult.userId,
      })
    }

    if (hasModuleAccess && isAdmin) {
      moduleAccess = normalizeModuleAccess(null, true)
    }

    return NextResponse.json({
      success: true,
      membership: {
        userId,
        role: membershipRole,
        moduleAccess,
      },
    })
  } catch (error) {
    console.error('[team/members PATCH]', error)
    const message =
      error instanceof Error ? error.message : 'Failed to update team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
    console.error('[team/members DELETE]', error)
    const message =
      error instanceof Error ? error.message : 'Failed to remove team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
