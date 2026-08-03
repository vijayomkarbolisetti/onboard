import { NextResponse } from 'next/server'
import { moduleIdFromDocumentFolder } from '@/lib/modulePermissions'
import { deleteObject, isS3Configured } from '@/lib/s3'
import { isTeamAuthContext, requireModuleAccess } from '@/lib/team-auth'

export async function DELETE(request: Request) {
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

    const folder = key.split('/')[0] ?? ''
    const moduleId = moduleIdFromDocumentFolder(folder)
    if (!moduleId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const authResult = await requireModuleAccess(moduleId, 'write')
    if (!isTeamAuthContext(authResult)) {
      return authResult
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
