import { NextResponse } from 'next/server'
import { createPreviewUrl, isS3Configured } from '@/lib/s3'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

export async function GET(request: Request) {
  const authResult = await requireTeamAuth()
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
    const fileName = String(searchParams.get('fileName') ?? '').trim()
    const expiresRaw = Number(searchParams.get('expiresIn') ?? '')
    const expiresInSeconds =
      Number.isFinite(expiresRaw) && expiresRaw > 0
        ? Math.min(Math.floor(expiresRaw), 60 * 60 * 24 * 7)
        : 60 * 15

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    // Only allow keys under org folders for this app
    if (!key.includes(`/${authResult.orgId}/`) && !key.includes(`${authResult.orgId}/`)) {
      // Soft check: keys are built as folder/orgId/... — reject obvious mismatches
      const parts = key.split('/')
      if (!parts.includes(authResult.orgId)) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
    }

    const url = await createPreviewUrl({
      key,
      fileName: fileName || undefined,
      expiresInSeconds,
    })
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create preview URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
