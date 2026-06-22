'use client'

import { useCallback, useState } from 'react'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import { notify } from '@/lib/toast'

type DeleteTarget = {
  id: string
  title: string
  description: string
  confirmLabel?: string
}

interface UseDeleteConfirmOptions {
  onConfirm: (id: string) => Promise<void>
  successMessage?: string
  errorMessage?: string
}

export function useDeleteConfirm({
  onConfirm,
  successMessage = 'Deleted successfully',
  errorMessage = 'Failed to delete',
}: UseDeleteConfirmOptions) {
  const [target, setTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openDeleteConfirm = useCallback(
    (
      id: string,
      itemLabel: string,
      options?: {
        title?: string
        description?: string
        confirmLabel?: string
      },
    ) => {
      setTarget({
        id,
        title: options?.title ?? 'Delete this item?',
        description:
          options?.description ??
          `This will permanently remove “${itemLabel}”. This action cannot be undone.`,
        confirmLabel: options?.confirmLabel,
      })
    },
    [],
  )

  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) {
      setTarget(null)
    }
  }, [deleting])

  const confirmDelete = useCallback(async () => {
    if (!target) {
      return
    }

    setDeleting(true)
    try {
      await onConfirm(target.id)
      notify.success(successMessage)
      setTarget(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : errorMessage)
    } finally {
      setDeleting(false)
    }
  }, [target, onConfirm, successMessage, errorMessage])

  const deleteModal = (
    <DeleteConfirmModal
      open={!!target}
      title={target?.title ?? ''}
      description={target?.description ?? ''}
      confirmLabel={target?.confirmLabel}
      loading={deleting}
      onClose={closeDeleteConfirm}
      onConfirm={confirmDelete}
    />
  )

  return {
    openDeleteConfirm,
    closeDeleteConfirm,
    deleteModal,
    isDeleting: deleting,
  }
}
