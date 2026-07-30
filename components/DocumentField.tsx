'use client'

import { Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { notify } from '@/lib/toast'
import type { StoredDocument } from '@/types'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type DocumentFolder = 'expenses' | 'paid-invoices' | 'open-invoices'

interface DocumentFieldProps {
  folder: DocumentFolder
  documents: StoredDocument[]
  onChange: (documents: StoredDocument[]) => void
  disabled?: boolean
}

async function uploadDocument(file: File, folder: DocumentFolder): Promise<StoredDocument> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File must be 15MB or smaller')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  })

  const payload = (await res.json()) as {
    document?: StoredDocument
    error?: string
  }

  if (!res.ok || !payload.document) {
    throw new Error(payload.error ?? 'Failed to upload document')
  }

  return payload.document
}

export async function openDocumentPreview(doc: StoredDocument) {
  const params = new URLSearchParams({
    key: doc.key,
    fileName: doc.fileName,
  })
  const res = await fetch(`/api/documents/preview?${params.toString()}`)
  const payload = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || !payload.url) {
    throw new Error(payload.error ?? 'Failed to open document')
  }
  window.open(payload.url, '_blank', 'noopener,noreferrer')
}

export function DocumentLinks({
  documents,
  className = '',
}: {
  documents?: StoredDocument[]
  className?: string
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const docs = documents ?? []

  if (docs.length === 0) {
    return <span className="text-theme-muted">—</span>
  }

  return (
    <div className={`flex max-w-[220px] flex-col gap-1 ${className}`}>
      {docs.map((doc) => (
        <button
          key={doc.key}
          type="button"
          title={doc.fileName}
          disabled={loadingKey === doc.key}
          onClick={async (event) => {
            event.stopPropagation()
            setLoadingKey(doc.key)
            try {
              await openDocumentPreview(doc)
            } catch (err) {
              notify.error(err instanceof Error ? err.message : 'Failed to open document')
            } finally {
              setLoadingKey(null)
            }
          }}
          className="inline-flex items-center gap-1.5 truncate rounded-lg border border-aqua/30 bg-aqua/10 px-2 py-1 text-left text-xs font-semibold text-aqua transition hover:border-aqua/50 hover:bg-aqua/15 disabled:opacity-60"
        >
          {loadingKey === doc.key ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <Eye size={12} className="shrink-0" />}
          <span className="truncate">{doc.fileName}</span>
        </button>
      ))}
    </div>
  )
}

export function DocumentField({
  folder,
  documents,
  onChange,
  disabled = false,
}: DocumentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewingKey, setPreviewingKey] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return
    setUploading(true)
    try {
      const uploaded: StoredDocument[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadDocument(file, folder))
      }
      onChange([...documents, ...uploaded])
      notify.success(uploaded.length === 1 ? 'Document uploaded' : `${uploaded.length} documents uploaded`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeDocument = async (doc: StoredDocument) => {
    if (disabled) return
    try {
      await fetch(`/api/documents?key=${encodeURIComponent(doc.key)}`, { method: 'DELETE' })
    } catch {
      // Best-effort delete from S3; still remove from form state
    }
    onChange(documents.filter((item) => item.key !== doc.key))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-theme px-3 py-2 text-sm font-medium text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading...' : 'Upload document'}
        </button>
        <span className="text-xs text-theme-muted">PDF, images, Word, Excel · max 15MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-theme px-4 py-6 text-center text-sm text-theme-muted">
          <FileText className="mx-auto mb-2 text-theme-muted" size={22} />
          No documents attached yet
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-theme bg-theme-elevated/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-theme-fg">{doc.fileName}</p>
                <p className="text-xs text-theme-muted">
                  {(doc.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title="Preview"
                  disabled={previewingKey === doc.key}
                  onClick={async () => {
                    setPreviewingKey(doc.key)
                    try {
                      await openDocumentPreview(doc)
                    } catch (err) {
                      notify.error(err instanceof Error ? err.message : 'Failed to open document')
                    } finally {
                      setPreviewingKey(null)
                    }
                  }}
                  className="rounded-lg p-2 text-theme-muted transition hover:bg-aqua/10 hover:text-aqua disabled:opacity-60"
                >
                  {previewingKey === doc.key ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
                <button
                  type="button"
                  title="Remove"
                  disabled={disabled || uploading}
                  onClick={() => void removeDocument(doc)}
                  className="rounded-lg p-2 text-theme-muted transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
