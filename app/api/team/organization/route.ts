import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSingleOrganizationId, getSingleOrganizationName } from '@/lib/single-org'
import { isTeamAuthContext, resolveTeamContext } from '@/lib/team-auth'

type ResolvedOrganization = {
  id: string
  name: string
  slug: string | null
}

async function resolveAppOrganization(
  userId: string,
  sessionOrgId?: string | null,
): Promise<ResolvedOrganization | null> {
  const client = await clerkClient()
  const configuredOrgId = getSingleOrganizationId()

  if (configuredOrgId) {
    const org = await client.organizations.getOrganization({ organizationId: configuredOrgId })
    return { id: org.id, name: org.name, slug: org.slug }
  }

  if (sessionOrgId) {
    const org = await client.organizations.getOrganization({ organizationId: sessionOrgId })
    return { id: org.id, name: org.name, slug: org.slug }
  }

  const { data: organizations } = await client.organizations.getOrganizationList({ limit: 2 })
  if (organizations.length === 1) {
    return {
      id: organizations[0].id,
      name: organizations[0].name,
      slug: organizations[0].slug,
    }
  }

  const { data: memberships } = await client.users.getOrganizationMembershipList({
    userId,
    limit: 1,
  })

  const membershipOrg = memberships[0]?.organization
  if (membershipOrg) {
    return {
      id: membershipOrg.id,
      name: membershipOrg.name,
      slug: membershipOrg.slug ?? null,
    }
  }

  return null
}

export async function GET() {
  const { userId, orgId: sessionOrgId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = await clerkClient()
    const orgName = getSingleOrganizationName()
    const organization = await resolveAppOrganization(userId, sessionOrgId)

    if (!organization) {
      return NextResponse.json({
        organization: null,
        membership: null,
        canBootstrap: true,
        organizationName: orgName,
      })
    }

    const { data: memberships } = await client.organizations.getOrganizationMembershipList({
      organizationId: organization.id,
      userId: [userId],
      limit: 1,
    })

    const membership = memberships[0]

    return NextResponse.json({
      organization,
      membership: membership
        ? { role: membership.role, id: membership.id }
        : null,
      canBootstrap: false,
      organizationName: orgName,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load organization'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (getSingleOrganizationId()) {
    return NextResponse.json(
      { error: 'Organization is already configured for this application.' },
      { status: 409 },
    )
  }

  try {
    const client = await clerkClient()
    const { data: existing } = await client.organizations.getOrganizationList({ limit: 1 })

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'An organization already exists. Only one organization is allowed.',
          organization: {
            id: existing[0].id,
            name: existing[0].name,
            slug: existing[0].slug,
          },
        },
        { status: 409 },
      )
    }

    const organization = await client.organizations.createOrganization({
      name: getSingleOrganizationName(),
      createdBy: userId,
    })

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to initialize organization'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH() {
  const context = await resolveTeamContext()
  if (!isTeamAuthContext(context)) {
    return context
  }

  return NextResponse.json({
    organizationId: context.orgId,
    role: context.orgRole,
  })
}
