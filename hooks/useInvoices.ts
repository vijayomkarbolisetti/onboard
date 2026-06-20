'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createInvoice,
  fetchInvoices,
  updateInvoiceStatus,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreateInvoiceInput, Invoice } from '@/types'

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInvoices()
      setInvoices(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateInvoiceInput) => {
    const created = await createInvoice(input)
    setInvoices((prev) => [created, ...prev])
    return created
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const previous = invoices
    setInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )

    try {
      await updateInvoiceStatus(id, status)
    } catch (err) {
      setInvoices(previous)
      throw err
    }
  }

  return { invoices, loading, error, reload: load, add, updateStatus }
}
