'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createPaidInvoice,
  createPaidInvoicesBulk,
  deletePaidInvoice,
  fetchPaidInvoices,
  updatePaidInvoice,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreatePaidInvoiceInput, PaidInvoice } from '@/types'

export function usePaidInvoices() {
  const [invoices, setInvoices] = useState<PaidInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setInvoices(await fetchPaidInvoices())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load paid invoices'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreatePaidInvoiceInput) => {
    const created = await createPaidInvoice(input)
    setInvoices((prev) => [created, ...prev])
    return created
  }

  const update = async (id: string, input: CreatePaidInvoiceInput) => {
    const previous = invoices
    setInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
    )
    try {
      await updatePaidInvoice(id, input)
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const previous = invoices
    setInvoices((prev) => prev.filter((item) => item.id !== id))
    try {
      await deletePaidInvoice(id)
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  const importMany = async (inputs: CreatePaidInvoiceInput[]) => {
    const created = await createPaidInvoicesBulk(inputs)
    setInvoices((prev) => [...created, ...prev])
    return created
  }

  return { invoices, loading, error, reload: load, add, update, remove, importMany }
}
