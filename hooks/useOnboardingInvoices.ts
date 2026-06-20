'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createOnboardingInvoice,
  createOnboardingInvoicesBulk,
  deleteOnboardingInvoice,
  fetchOnboardingInvoices,
  updateOnboardingInvoice,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreateOnboardingInvoiceInput, OnboardingInvoiceRecord } from '@/types'

export function useOnboardingInvoices() {
  const [records, setRecords] = useState<OnboardingInvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOnboardingInvoices()
      setRecords(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateOnboardingInvoiceInput) => {
    const created = await createOnboardingInvoice(input)
    setRecords((prev) => [created, ...prev])
    return created
  }

  const update = async (id: string, input: CreateOnboardingInvoiceInput) => {
    const previous = records
    setRecords((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
    )
    try {
      await updateOnboardingInvoice(id, input)
    } catch (err) {
      setRecords(previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const previous = records
    setRecords((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteOnboardingInvoice(id)
    } catch (err) {
      setRecords(previous)
      throw err
    }
  }

  const importMany = async (inputs: CreateOnboardingInvoiceInput[]) => {
    const created = await createOnboardingInvoicesBulk(inputs)
    setRecords((prev) => [...created, ...prev])
    return created
  }

  return { records, loading, error, reload: load, add, update, remove, importMany }
}
