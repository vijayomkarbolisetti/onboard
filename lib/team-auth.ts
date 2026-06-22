import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSingleOrganizationId } from '@/lib/single-org'

export type TeamAuthContext = {
  userId: string
  orgId: string
  orgRole: string
  isAdmin: boolean
}

async function resolveOrganizationId(
  sessionOrgId: string | null | undefined,
  userId: string,
): Promise<string | null> {
  const configuredOrgId = getSingleOrganizationId()
  if (configuredOrgId) {
    return configuredOrgId
  }

  if (sessionOrgId) {
    return sessionOrgId
  }

  const client = await clerkClient()
  const { data: organizations } = await client.organizations.getOrganizationList({
    limit: 2,
  })

  if (organizations.length === 1) {
    return organizations[0].id
  }

  const { data: memberships } = await client.users.getOrganizationMembershipList({
    userId,
    limit: 1,
  })

  return memberships[0]?.organization.id ?? null
}

async function resolveMembershipRole(
  userId: string,
  orgId: string,
  sessionOrgId: string | null | undefined,
  sessionRole: string | null | undefined,
): Promise<string | null> {
  if (sessionOrgId === orgId && sessionRole) {
    return sessionRole
  }

  const client = await clerkClient()
  const { data: memberships } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    userId: [userId],
    limit: 1,
  })

  return memberships[0]?.role ?? null
}

export async function resolveTeamContext(): Promise<TeamAuthContext | NextResponse> {
  const { userId, orgId, orgRole } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedOrgId = await resolveOrganizationId(orgId, userId)
  if (!resolvedOrgId) {
    return NextResponse.json(
      { error: 'Organization is not configured yet.' },
      { status: 400 },
    )
  }

  const resolvedRole = await resolveMembershipRole(userId, resolvedOrgId, orgId, orgRole)
  if (!resolvedRole) {
    return NextResponse.json(
      { error: 'You are not a member of this organization. Ask an admin for an invite.' },
      { status: 403 },
    )
  }

  const isAdmin = resolvedRole === 'org:admin'

  return {
    userId,
    orgId: resolvedOrgId,
    orgRole: resolvedRole,
    isAdmin,
  }
}

export async function requireTeamAuth(
  requireAdmin = false,
): Promise<TeamAuthContext | NextResponse> {
  const context = await resolveTeamContext()
  if (context instanceof NextResponse) {
    return context
  }

  if (requireAdmin && !context.isAdmin) {
    return NextResponse.json(
      { error: 'Only organization admins can perform this action' },
      { status: 403 },
    )
  }

  return context
}

export function isTeamAuthContext(
  result: TeamAuthContext | NextResponse,
): result is TeamAuthContext {
  return !(result instanceof NextResponse)
}
