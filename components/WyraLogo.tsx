'use client'

import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

interface WyraLogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function WyraLogo({
  className = 'h-10 w-auto max-w-full object-contain object-left',
  width = 130,
  height = 44,
  priority = false,
}: WyraLogoProps) {
  const { theme, mounted } = useTheme()

  if (!mounted) {
    return <div className={className} style={{ width, height }} aria-hidden />
  }

  const isLight = theme === 'light'

  return (
    <Image
      src={isLight ? '/wyra_logo_lightTheme.png' : '/logo.png'}
      alt="Wyra"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
