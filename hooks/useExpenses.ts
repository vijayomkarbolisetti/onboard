'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createExpense,
  createExpensesBulk,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from '@/lib/dataService'
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
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateExpenseInput) => {
    const created = await createExpense(input)
    setExpenses((prev) => [created, ...prev])
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
    const created = await createExpensesBulk(inputs)
    setExpenses((prev) => [...created, ...prev])
    return created
  }

  return { expenses, loading, error, reload: load, add, update, remove, importMany }
}
