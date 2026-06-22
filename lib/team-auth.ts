import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  getSingleOrganizationId,
  getSingleOrganizationName,
  type AppOrganization,
} from '@/lib/single-org'

export type TeamAuthContext = {
  userId: string
  orgId: string
  orgRole: string
  isAdmin: boolean
}

export async function listInstanceOrganizations() {
  const client = await clerkClient()
  const { data } = await client.organizations.getOrganizationList({ limit: 100 })
  return data
}

export async function resolveAppOrganization(
  userId: string,
  sessionOrgId?: string | null,
): Promise<AppOrganization | null> {
  const client = await clerkClient()
  const configuredOrgId = getSingleOrganizationId()
  const preferredName = getSingleOrganizationName()

  if (configuredOrgId) {
    const org = await client.organizations.getOrganization({ organizationId: configuredOrgId })
    return { id: org.id, name: org.name, slug: org.slug }
  }

  if (sessionOrgId) {
    const org = await client.organizations.getOrganization({ organizationId: sessionOrgId })
    return { id: org.id, name: org.name, slug: org.slug }
  }

  const { data: memberships } = await client.users.getOrganizationMembershipList({
    userId,
    limit: 10,
  })

  if (memberships.length === 1) {
    const org = memberships[0].organization
    return { id: org.id, name: org.name, slug: org.slug ?? null }
  }

  if (memberships.length > 1) {
    const preferred = memberships.find((item) => item.organization.name === preferredName)
    const org = (preferred ?? memberships[0]).organization
    return { id: org.id, name: org.name, slug: org.slug ?? null }
  }

  const organizations = await listInstanceOrganizations()
  if (organizations.length === 0) {
    return null
  }

  const preferred = organizations.find((org) => org.name === preferredName)
  const org = preferred ?? organizations[0]
  return { id: org.id, name: org.name, slug: org.slug }
}

export async function getUserOrganizationMembership(userId: string, organizationId: string) {
  const client = await clerkClient()
  const { data: memberships } = await client.organizations.getOrganizationMembershipList({
    organizationId,
    userId: [userId],
    limit: 1,
  })
  return memberships[0] ?? null
}

export async function canBootstrapOrganization() {
  const organizations = await listInstanceOrganizations()
  return organizations.length === 0
}

async function resolveOrganizationId(
  sessionOrgId: string | null | undefined,
  userId: string,
): Promise<string | null> {
  const client = await clerkClient()
  const configuredOrgId = getSingleOrganizationId()

  const { data: memberships } = await client.users.getOrganizationMembershipList({
    userId,
    limit: 10,
  })

  const membershipOrgIds = memberships.map((membership) => membership.organization.id)

  if (configuredOrgId && membershipOrgIds.includes(configuredOrgId)) {
    return configuredOrgId
  }

  if (sessionOrgId && membershipOrgIds.includes(sessionOrgId)) {
    return sessionOrgId
  }

  if (memberships.length === 1) {
    return memberships[0].organization.id
  }

  if (memberships.length > 1 && sessionOrgId) {
    return sessionOrgId
  }

  if (memberships.length > 0) {
    return memberships[0].organization.id
  }

  if (configuredOrgId) {
    return configuredOrgId
  }

  if (sessionOrgId) {
    return sessionOrgId
  }

  const { data: organizations } = await client.organizations.getOrganizationList({
    limit: 2,
  })

  if (organizations.length === 1) {
    return organizations[0].id
  }

  return null
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
