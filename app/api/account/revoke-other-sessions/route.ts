import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Revoke every active Clerk session for the current user except this one.
 * Used after password updates so other devices are signed out immediately.
 */
export async function POST() {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = await clerkClient()
    const { data: sessions } = await client.sessions.getSessionList({
      userId,
      status: 'active',
      limit: 100,
    })

    const otherSessions = sessions.filter((session) => session.id !== sessionId)
    await Promise.all(
      otherSessions.map((session) => client.sessions.revokeSession(session.id)),
    )

    return NextResponse.json({
      ok: true,
      revokedCount: otherSessions.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to revoke other sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
