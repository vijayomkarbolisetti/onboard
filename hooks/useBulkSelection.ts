'use client'

import { useCallback, useEffect, useState } from 'react'

export function useBulkSelection(itemIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(itemIds)
      const next = new Set([...prev].filter((id) => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [itemIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (itemIds.length === 0) return prev
      if (prev.size === itemIds.length) return new Set()
      return new Set(itemIds)
    })
  }, [itemIds])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const allSelected = itemIds.length > 0 && selectedIds.size === itemIds.length
  const selectedCount = selectedIds.size
  const selectedList = [...selectedIds]

  return {
    selectedIds,
    selectedList,
    selectedCount,
    allSelected,
    someSelected: selectedCount > 0,
    toggle,
    toggleAll,
    clear,
    isSelected,
  }
}
