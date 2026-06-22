'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createExpense,
  createExpensesBulk,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreateExpenseInput, Expense } from '@/types'

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setExpenses(await fetchExpenses())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expenses'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateExpenseInput) => {
    const created = await createExpense(input)
    setExpenses((prev) => [...prev, created])
    return created
  }

  const update = async (id: string, input: CreateExpenseInput) => {
    const previous = expenses
    setExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
    )
    try {
      await updateExpense(id, input)
    } catch (err) {
      setExpenses(previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const previous = expenses
    setExpenses((prev) => prev.filter((item) => item.id !== id))
    try {
      await deleteExpense(id)
    } catch (err) {
      setExpenses(previous)
      throw err
    }
  }

  const importMany = async (inputs: CreateExpenseInput[]) => {
    if (inputs.length === 0) return []
    await createExpensesBulk(inputs)
    await load()
    return inputs.length
  }

  return { expenses, loading, error, reload: load, add, update, remove, importMany }
}
