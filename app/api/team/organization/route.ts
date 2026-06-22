import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  canBootstrapOrganization,
  getUserOrganizationMembership,
  isTeamAuthContext,
  listInstanceOrganizations,
  resolveAppOrganization,
  resolveTeamContext,
} from '@/lib/team-auth'
import { getSingleOrganizationId, getSingleOrganizationName } from '@/lib/single-org'

export async function GET() {
  const { userId, orgId: sessionOrgId } = await auth({ treatPendingAsSignedOut: false })

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgName = getSingleOrganizationName()
    const organization = await resolveAppOrganization(userId, sessionOrgId)
    const bootstrapAllowed = await canBootstrapOrganization()

    if (!organization) {
      return NextResponse.json({
        organization: null,
        membership: null,
        canBootstrap: bootstrapAllowed,
        organizationName: orgName,
      })
    }

    const membership = await getUserOrganizationMembership(userId, organization.id)

    return NextResponse.json({
      organization,
      membership: membership
        ? { role: membership.role, id: membership.id }
        : null,
      canBootstrap: bootstrapAllowed,
      organizationName: orgName,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load organization'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  const { userId } = await auth({ treatPendingAsSignedOut: false })

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
    const existing = await listInstanceOrganizations()

    if (existing.length > 0) {
      const preferredName = getSingleOrganizationName()
      const organization = existing.find((org) => org.name === preferredName) ?? existing[0]
      const membership = await getUserOrganizationMembership(userId, organization.id)

      if (membership) {
        return NextResponse.json({
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        })
      }

      return NextResponse.json(
        {
          error:
            'Wyra is already set up. Ask an admin to invite you before signing in again.',
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        },
        { status: 403 },
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
