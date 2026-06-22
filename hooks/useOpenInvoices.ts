'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createOpenInvoice,
  createOpenInvoicesBulk,
  deleteOpenInvoice,
  fetchOpenInvoices,
  updateOpenInvoice,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreateOpenInvoiceInput, OpenInvoice } from '@/types'

export function useOpenInvoices() {
  const [invoices, setInvoices] = useState<OpenInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setInvoices(await fetchOpenInvoices())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load open invoices'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateOpenInvoiceInput) => {
    const created = await createOpenInvoice(input)
    setInvoices((prev) => [created, ...prev])
    return created
  }

  const update = async (id: string, input: CreateOpenInvoiceInput) => {
    const previous = invoices
    setInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
    )
    try {
      await updateOpenInvoice(id, input)
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const previous = invoices
    setInvoices((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteOpenInvoice(id)
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  const removeMany = async (ids: string[]) => {
    if (ids.length === 0) return

    const idSet = new Set(ids)
    const previous = invoices
    setInvoices((prev) => prev.filter((item) => !idSet.has(item.id)))

    try {
      await Promise.all(ids.map((id) => deleteOpenInvoice(id)))
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  const importMany = async (inputs: CreateOpenInvoiceInput[]) => {
    const created = await createOpenInvoicesBulk(inputs)
    setInvoices((prev) => [...created, ...prev])
    return created
  }

  return { invoices, loading, error, reload: load, add, update, remove, removeMany, importMany }
}
