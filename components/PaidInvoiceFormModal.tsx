'use client'

import { CompanyNameSelect, WyraSelect } from '@/components/CompanyNameSelect'
import {
  fetchDocumentPreviewUrl,
  isPreviewableImage,
  isPreviewablePdf,
  uploadDocument,
} from '@/components/DocumentField'
import { UsdEquivalentHint } from '@/components/UsdEquivalentHint'
import { suggestPaidInvoiceFromFile } from '@/lib/paidInvoiceExcel'
import { FileText, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CURRENCY_OPTIONS, resolveCurrency } from '@/lib/currency'
import { notify } from '@/lib/toast'
import type { CreatePaidInvoiceInput, PaidInvoice, StoredDocument } from '@/types'
import {
  formatCompanyNames,
  parseCompanyNames,
  resolveInvoiceNumber,
  toFormText,
} from '@/utils/format'

interface PaidInvoiceFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: PaidInvoice | null
  companyNames: string[]
  onClose: () => void
  onSubmit: (input: CreatePaidInvoiceInput) => Promise<void>
}

const emptyForm: CreatePaidInvoiceInput = {
  invoiceDate: '',
  customerName: '',
  companyName: '',
  invoiceNumber: '',
  invoiceAmount: '',
  currency: 'USD',
  status: '',
  paymentDate: '',
  paymentMethod: '',
  salesPersonName: '',
  documents: [],
}

type PaidInvoiceFormState = Omit<CreatePaidInvoiceInput, 'companyName'>

type PreviewState = {
  url: string
  contentType: string
  fileName: string
  local?: boolean
}

export function PaidInvoiceFormModal({
  open,
  mode,
  initial,
  companyNames,
  onClose,
  onSubmit,
}: PaidInvoiceFormModalProps) {
  const [form, setForm] = useState<PaidInvoiceFormState>(emptyForm)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [autofillNote, setAutofillNote] = useState<string | null>(null)
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const localPreviewUrlRef = useRef<string | null>(null)
  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    setAutofillNote(null)
    setPreview(null)
    setActiveDocKey(null)
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current)
      localPreviewUrlRef.current = null
    }

    if (isEdit && initial) {
      const docs = initial.documents ?? []
      setForm({
        invoiceDate: initial.invoiceDate,
        customerName: initial.customerName,
        invoiceNumber: resolveInvoiceNumber(initial as unknown as Record<string, unknown>),
        invoiceAmount: toFormText(initial.invoiceAmount),
        currency: resolveCurrency(initial.currency, initial.invoiceAmount),
        status: initial.status,
        paymentDate: initial.paymentDate,
        paymentMethod: initial.paymentMethod,
        salesPersonName: initial.salesPersonName ?? '',
        documents: docs,
      })
      setSelectedCompanies(parseCompanyNames(initial.companyName))
      if (docs[0]) setActiveDocKey(docs[0].key)
    } else {
      setForm(emptyForm)
      setSelectedCompanies([])
    }
  }, [open, isEdit, initial])

  useEffect(() => {
    if (!open || !activeDocKey) return
    const doc = (form.documents ?? []).find((item) => item.key === activeDocKey)
    if (!doc) return
    if (preview?.local) return

    let cancelled = false
    setPreviewLoading(true)
    void fetchDocumentPreviewUrl(doc)
      .then((url) => {
        if (cancelled) return
        setPreview({
          url,
          contentType: doc.contentType,
          fileName: doc.fileName,
          local: false,
        })
      })
      .catch((err) => {
        if (cancelled) return
        notify.error(err instanceof Error ? err.message : 'Failed to load preview')
        setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, activeDocKey, form.documents, preview?.local])

  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current)
        localPreviewUrlRef.current = null
      }
    }
  }, [])

  if (!open) return null

  const set = (key: keyof PaidInvoiceFormState, value: string | StoredDocument[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const applyAutofill = (suggestion: Partial<CreatePaidInvoiceInput>) => {
    const filled: string[] = []
    setForm((prev) => {
      const next = { ...prev }
      const apply = (key: keyof PaidInvoiceFormState, value?: string) => {
        if (!value || !String(value).trim()) return
        ;(next as Record<string, unknown>)[key] = String(value).trim()
        filled.push(key)
      }
      apply('invoiceDate', suggestion.invoiceDate)
      apply('customerName', suggestion.customerName)
      apply('invoiceNumber', suggestion.invoiceNumber)
      apply('invoiceAmount', suggestion.invoiceAmount)
      apply('currency', suggestion.currency)
      apply('status', suggestion.status)
      apply('paymentDate', suggestion.paymentDate)
      apply('paymentMethod', suggestion.paymentMethod)
      apply('salesPersonName', suggestion.salesPersonName)
      return next
    })

    if (suggestion.companyName?.trim()) {
      const companies = parseCompanyNames(suggestion.companyName)
      if (companies.length > 0) {
        setSelectedCompanies(companies)
        filled.push('companyName')
      }
    }

    if (filled.length > 0) {
      setAutofillNote('Fields filled from the uploaded file — you can edit any value before saving.')
    } else {
      setAutofillNote('Document uploaded. No fields could be auto-detected — fill the form manually.')
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || submitting) return
    setUploading(true)
    try {
      const uploaded: StoredDocument[] = []
      let firstFile: File | null = null

      for (const file of Array.from(files)) {
        if (!firstFile) firstFile = file
        uploaded.push(await uploadDocument(file, 'paid-invoices'))
      }

      setForm((prev) => ({
        ...prev,
        documents: [...(prev.documents ?? []), ...uploaded],
      }))

      const focusDoc = uploaded[0]
      if (focusDoc && firstFile) {
        if (localPreviewUrlRef.current) {
          URL.revokeObjectURL(localPreviewUrlRef.current)
          localPreviewUrlRef.current = null
        }
        const canLocalPreview =
          isPreviewableImage(firstFile.type, firstFile.name) ||
          isPreviewablePdf(firstFile.type, firstFile.name)
        if (canLocalPreview) {
          const localUrl = URL.createObjectURL(firstFile)
          localPreviewUrlRef.current = localUrl
          setPreview({
            url: localUrl,
            contentType: firstFile.type || focusDoc.contentType,
            fileName: firstFile.name,
            local: true,
          })
        } else {
          setPreview(null)
        }
        setActiveDocKey(focusDoc.key)

        setAutofillNote('Reading document for auto-fill…')
        const suggestion = await suggestPaidInvoiceFromFile(firstFile)
        applyAutofill(suggestion)
      }

      notify.success(uploaded.length === 1 ? 'Document uploaded' : `${uploaded.length} documents uploaded`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeDocument = async (doc: StoredDocument) => {
    if (submitting || uploading) return
    try {
      await fetch(`/api/documents?key=${encodeURIComponent(doc.key)}`, { method: 'DELETE' })
    } catch {
      // Best-effort delete from S3; still remove from form state
    }

    const nextDocs = (form.documents ?? []).filter((item) => item.key !== doc.key)
    setForm((prev) => ({ ...prev, documents: nextDocs }))

    if (activeDocKey === doc.key) {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current)
        localPreviewUrlRef.current = null
      }
      setPreview(null)
      setActiveDocKey(nextDocs[0]?.key ?? null)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const payload = {
      invoiceDate: form.invoiceDate,
      customerName: form.customerName.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceAmount: form.invoiceAmount.trim(),
      currency: form.currency.trim() || 'USD',
      status: form.status.trim(),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod.trim(),
      salesPersonName: form.salesPersonName.trim(),
      documents: form.documents ?? [],
    }

    const companies = selectedCompanies.map((name) => name.trim()).filter(Boolean)
    const companyName = formatCompanyNames(companies)

    setSubmitting(true)
    try {
      if (isEdit) {
        await onSubmit({ ...payload, companyName })
      } else if (companies.length === 0) {
        await onSubmit({ ...payload, companyName: '' })
      } else {
        for (const companyName of companies) {
          await onSubmit({ ...payload, companyName })
        }
      }
      notify.success(
        isEdit
          ? 'Paid invoice updated'
          : companies.length <= 1
            ? 'Paid invoice added'
            : `${companies.length} paid invoices added`,
      )
      setForm(emptyForm)
      setSelectedCompanies([])
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting || uploading) return
    setForm(emptyForm)
    setSelectedCompanies([])
    onClose()
  }

  const documents = form.documents ?? []
  const showImage = preview && isPreviewableImage(preview.contentType, preview.fileName)
  const showPdf = preview && isPreviewablePdf(preview.contentType, preview.fileName)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 theme-overlay backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden theme-modal">
        <div className="h-1 shrink-0 bg-wyra-gradient" />
        <div className="flex shrink-0 items-center justify-between border-b border-theme px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-theme-fg">
              {isEdit ? 'Edit Paid Invoice' : 'Add Paid Invoice'}
            </h2>
            <p className="text-sm text-theme-muted">
              Upload a document to preview and auto-fill — all fields stay editable
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-theme-muted hover:bg-theme-hover hover:text-theme-fg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-theme px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={submitting || uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-theme px-4 py-2.5 text-sm font-medium text-theme-fg transition hover:bg-theme-hover disabled:opacity-60"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading...' : 'Upload document'}
              </button>
              <span className="text-xs text-theme-muted">
                PDF, images, Word, Excel · max 15MB
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              className="hidden"
              disabled={submitting || uploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {autofillNote ? (
              <p className="mt-2 text-xs text-aqua">{autofillNote}</p>
            ) : null}
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(280px,1fr)_minmax(320px,1.15fr)]">
            <div className="flex min-h-[280px] flex-col border-b border-theme lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-theme px-4 py-3">
                <p className="text-sm font-semibold text-theme-fg">Document preview</p>
                {documents.length > 0 ? (
                  <span className="text-xs text-theme-muted">{documents.length} file(s)</span>
                ) : null}
              </div>

              {documents.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-b border-theme px-3 py-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => {
                        if (localPreviewUrlRef.current) {
                          URL.revokeObjectURL(localPreviewUrlRef.current)
                          localPreviewUrlRef.current = null
                        }
                        setPreview(null)
                        setActiveDocKey(doc.key)
                      }}
                      className={
                        activeDocKey === doc.key
                          ? 'shrink-0 rounded-lg border border-aqua/40 bg-aqua/10 px-2.5 py-1 text-xs font-semibold text-aqua'
                          : 'shrink-0 rounded-lg border border-theme px-2.5 py-1 text-xs text-theme-muted hover:bg-theme-hover'
                      }
                      title={doc.fileName}
                    >
                      {doc.fileName.length > 22 ? `${doc.fileName.slice(0, 20)}…` : doc.fileName}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="relative flex min-h-0 flex-1 flex-col bg-theme-elevated/30 p-3">
                {previewLoading ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-theme-muted">
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Loading preview…
                  </div>
                ) : showImage && preview ? (
                  <img
                    src={preview.url}
                    alt={preview.fileName}
                    className="mx-auto max-h-full max-w-full object-contain"
                  />
                ) : showPdf && preview ? (
                  <iframe
                    title={preview.fileName}
                    src={preview.url}
                    className="h-full min-h-[320px] w-full flex-1 rounded-lg border border-theme bg-white"
                  />
                ) : documents.length > 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
                    <FileText className="text-theme-muted" size={36} />
                    <div>
                      <p className="text-sm font-medium text-theme-fg">
                        {documents.find((d) => d.key === activeDocKey)?.fileName ?? 'Document attached'}
                      </p>
                      <p className="mt-1 text-xs text-theme-muted">
                        Inline preview is available for PDF and images. Word/Excel can still autofill
                        when supported.
                      </p>
                    </div>
                    {activeDocKey ? (
                      <button
                        type="button"
                        className="rounded-lg border border-theme px-3 py-1.5 text-xs font-semibold text-theme-fg hover:bg-theme-hover"
                        onClick={() => {
                          const doc = documents.find((d) => d.key === activeDocKey)
                          if (!doc) return
                          void fetchDocumentPreviewUrl(doc)
                            .then((url) => window.open(url, '_blank', 'noopener,noreferrer'))
                            .catch((err) =>
                              notify.error(err instanceof Error ? err.message : 'Failed to open document'),
                            )
                        }}
                      >
                        Open in new tab
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center text-sm text-theme-muted">
                    <FileText className="mb-2" size={28} />
                    Upload a document to see preview here
                  </div>
                )}
              </div>

              {documents.length > 0 ? (
                <ul className="max-h-28 space-y-1 overflow-y-auto border-t border-theme px-3 py-2">
                  {documents.map((doc) => (
                    <li
                      key={doc.key}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-theme-hover"
                    >
                      <button
                        type="button"
                        className="min-w-0 truncate text-left font-medium text-theme-fg"
                        onClick={() => {
                          if (localPreviewUrlRef.current) {
                            URL.revokeObjectURL(localPreviewUrlRef.current)
                            localPreviewUrlRef.current = null
                          }
                          setPreview(null)
                          setActiveDocKey(doc.key)
                        }}
                      >
                        {doc.fileName}
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        disabled={submitting || uploading}
                        onClick={() => void removeDocument(doc)}
                        className="rounded-lg p-1.5 text-theme-muted hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Invoice Date">
                  <input
                    type="date"
                    className="wyra-input"
                    value={form.invoiceDate}
                    onChange={(e) => set('invoiceDate', e.target.value)}
                  />
                </Field>

                <Field label="Invoice Number">
                  <input
                    className="wyra-input"
                    value={form.invoiceNumber}
                    onChange={(e) => set('invoiceNumber', e.target.value)}
                    placeholder="INV-001"
                  />
                </Field>

                <Field label="Customer Name">
                  <input
                    className="wyra-input"
                    value={form.customerName}
                    onChange={(e) => set('customerName', e.target.value)}
                    placeholder="Customer name"
                  />
                </Field>

                <Field label="Company Name">
                  <CompanyNameSelect
                    multiple
                    value={selectedCompanies}
                    onChange={setSelectedCompanies}
                    companyNames={companyNames}
                  />
                </Field>

                <Field label="Invoice Amount">
                  <input
                    type="text"
                    className="wyra-input"
                    value={form.invoiceAmount}
                    onChange={(e) => set('invoiceAmount', e.target.value)}
                    placeholder="Enter amount"
                  />
                  <UsdEquivalentHint amount={form.invoiceAmount} currency={form.currency} />
                </Field>

                <Field label="Currency">
                  <WyraSelect
                    value={form.currency}
                    onChange={(value) => set('currency', value)}
                    allowEmpty={false}
                    options={CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))}
                  />
                </Field>

                <Field label="Status">
                  <input
                    className="wyra-input"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    placeholder="Paid"
                  />
                </Field>

                <Field label="Payment Date">
                  <input
                    type="date"
                    className="wyra-input"
                    value={form.paymentDate}
                    onChange={(e) => set('paymentDate', e.target.value)}
                  />
                </Field>

                <Field label="Payment Method">
                  <input
                    className="wyra-input"
                    value={form.paymentMethod}
                    onChange={(e) => set('paymentMethod', e.target.value)}
                    placeholder="Bank transfer, Card..."
                  />
                </Field>

                <Field label="Sales Person Name">
                  <input
                    className="wyra-input"
                    value={form.salesPersonName}
                    onChange={(e) => set('salesPersonName', e.target.value)}
                    placeholder="Sales person name (optional)"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-theme px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-theme px-5 py-2.5 text-sm font-medium text-theme-muted hover:bg-theme-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn-wyra disabled:opacity-60"
            >
              {isEdit ? <Save size={16} /> : <Plus size={16} />}
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="wyra-label">{label}</span>
      {children}
    </label>
  )
}
