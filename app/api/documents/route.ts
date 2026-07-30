import { NextResponse } from 'next/server'
import { deleteObject, isS3Configured } from '@/lib/s3'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

export async function DELETE(request: Request) {
  const authResult = await requireTeamAuth(true)
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: 'Document storage is not configured. Add AWS S3 environment variables.' },
      { status: 503 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const key = String(searchParams.get('key') ?? '').trim()
    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    const parts = key.split('/')
    if (!parts.includes(authResult.orgId)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await deleteObject(key)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
