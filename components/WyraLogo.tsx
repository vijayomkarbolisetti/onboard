'use client'

import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

interface WyraLogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
  /** Force light/dark logo on auth pages regardless of stored app theme */
  variant?: 'auto' | 'light' | 'dark'
}

const LOGO = {
  light: '/wyra_logo_lightTheme.svg',
  dark: '/logo.png',
} as const

export function WyraLogo({
  className = 'h-10 w-auto max-w-full object-contain object-left',
  width = 130,
  height = 44,
  priority = false,
  variant = 'auto',
}: WyraLogoProps) {
  const { theme, mounted } = useTheme()

  const isLight = variant === 'light' || (variant === 'auto' && theme === 'light')

  if (!mounted && variant === 'auto') {
    return <div className={className} style={{ width, height }} aria-hidden />
  }

  return (
    <Image
      src={isLight ? LOGO.light : LOGO.dark}
      alt="Wyra"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
