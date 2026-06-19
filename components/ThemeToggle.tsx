'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) {
    return <div className={cn('h-10 w-10 rounded-xl', className)} aria-hidden />
  }

  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200',
        'border-theme bg-theme-elevated text-theme-muted hover:text-theme-fg hover:border-aqua/40',
        className,
      )}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} className="text-lime" />}
    </button>
  )
}
