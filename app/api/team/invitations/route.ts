import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  try {
    const client = await clerkClient()
    const { data } = await client.organizations.getOrganizationInvitationList({
      organizationId: authResult.orgId,
      status: ['pending'],
      limit: 100,
    })

    const invitations = data.map((invitation) => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
    }))

    return NextResponse.json({ invitations })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load invitations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  let body: { emailAddress?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const emailAddress = body.emailAddress?.trim().toLowerCase()
  if (!emailAddress || !emailPattern.test(emailAddress)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  const role = body.role === 'org:admin' ? 'org:admin' : 'org:member'

  try {
    const client = await clerkClient()
    const origin = new URL(request.url).origin
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: authResult.orgId,
      inviterUserId: authResult.userId,
      emailAddress,
      role,
      redirectUrl: `${origin}/accept-invitation`,
    })

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send invitation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
