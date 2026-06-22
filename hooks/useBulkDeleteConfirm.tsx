'use client'

import { useCallback, useState } from 'react'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import { notify } from '@/lib/toast'

interface UseBulkDeleteConfirmOptions {
  onConfirm: (ids: string[]) => Promise<void>
  itemLabel?: string
  successMessage?: string
  errorMessage?: string
}

export function useBulkDeleteConfirm({
  onConfirm,
  itemLabel = 'records',
  successMessage,
  errorMessage = 'Failed to delete selected items',
}: UseBulkDeleteConfirmOptions) {
  const [ids, setIds] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openBulkDeleteConfirm = useCallback((selectedIds: string[]) => {
    if (selectedIds.length === 0) return
    setIds(selectedIds)
  }, [])

  const closeBulkDeleteConfirm = useCallback(() => {
    if (!deleting) {
      setIds(null)
    }
  }, [deleting])

  const confirmBulkDelete = useCallback(async () => {
    if (!ids || ids.length === 0) return

    setDeleting(true)
    try {
      await onConfirm(ids)
      notify.success(successMessage ?? `Deleted ${ids.length} ${itemLabel}`)
      setIds(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : errorMessage)
    } finally {
      setDeleting(false)
    }
  }, [ids, onConfirm, successMessage, itemLabel, errorMessage])

  const bulkDeleteModal = (
    <DeleteConfirmModal
      open={Boolean(ids?.length)}
      title={`Delete ${ids?.length ?? 0} selected ${itemLabel}?`}
      description={`This will permanently remove ${ids?.length ?? 0} selected ${itemLabel}. This action cannot be undone.`}
      confirmLabel={`Delete ${ids?.length ?? 0}`}
      loading={deleting}
      onClose={closeBulkDeleteConfirm}
      onConfirm={confirmBulkDelete}
    />
  )

  return {
    openBulkDeleteConfirm,
    closeBulkDeleteConfirm,
    bulkDeleteModal,
    isBulkDeleting: deleting,
  }
}
