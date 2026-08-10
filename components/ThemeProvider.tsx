'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')
}

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isAuthRoute(pathname)) {
      document.documentElement.classList.add('light')
      setTheme('light')
      setMounted(true)
      return
    }

    const stored = localStorage.getItem('wyra-theme')
    const initial: Theme = stored === 'light' ? 'light' : 'dark'
    setTheme(initial)
    document.documentElement.classList.toggle('light', initial === 'light')
    setMounted(true)
  }, [pathname])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('wyra-theme', next)
      document.documentElement.classList.toggle('light', next === 'light')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
