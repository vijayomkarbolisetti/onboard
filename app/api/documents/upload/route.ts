import { NextResponse } from 'next/server'
import { buildObjectKey, isS3Configured, uploadObject } from '@/lib/s3'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_FOLDERS = new Set(['expenses', 'paid-invoices', 'open-invoices'])

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export async function POST(request: Request) {
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
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = String(formData.get('folder') ?? '').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid document folder' }, { status: 400 })
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File must be 15MB or smaller' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF, image, Word, or Excel files.' },
        { status: 400 },
      )
    }

    const key = buildObjectKey(`${folder}/${authResult.orgId}`, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadObject({ key, body: buffer, contentType })

    return NextResponse.json({
      document: {
        key,
        fileName: file.name,
        contentType,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
