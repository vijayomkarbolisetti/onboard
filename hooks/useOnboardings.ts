'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createOnboarding,
  deleteOnboarding,
  fetchOnboardings,
  updateOnboarding,
  updateOnboardingStatus,
} from '@/lib/dataService'
import { notify } from '@/lib/toast'
import type { CreateOnboardingInput, Onboarding } from '@/types'

export function useOnboardings() {
  const [onboardings, setOnboardings] = useState<Onboarding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOnboardings()
      setOnboardings(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load onboardings'
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (input: CreateOnboardingInput) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Onboarding = {
      id: tempId,
      ...input,
      createdAt: new Date().toISOString(),
    }

    setOnboardings((prev) => [optimistic, ...prev])

    void createOnboarding(input)
      .then((created) => {
        setOnboardings((prev) =>
          prev.map((item) => (item.id === tempId ? created : item)),
        )
      })
      .catch((err) => {
        setOnboardings((prev) => prev.filter((item) => item.id !== tempId))
        setError(err instanceof Error ? err.message : 'Failed to create onboarding')
      })

    return optimistic
  }

  const updateStatus = async (id: string, status: Onboarding['status']) => {
    const previous = onboardings
    setOnboardings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )

    try {
      await updateOnboardingStatus(id, status)
    } catch (err) {
      setOnboardings(previous)
      throw err
    }
  }

  const update = async (id: string, input: CreateOnboardingInput) => {
    const previous = onboardings
    setOnboardings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
    )

    try {
      await updateOnboarding(id, input)
    } catch (err) {
      setOnboardings(previous)
      throw err
    }
  }

  const remove = async (id: string) => {
    const previous = onboardings
    setOnboardings((prev) => prev.filter((item) => item.id !== id))

    try {
      await deleteOnboarding(id)
    } catch (err) {
      setOnboardings(previous)
      throw err
    }
  }

  return { onboardings, loading, error, reload: load, add, update, updateStatus, remove }
}
