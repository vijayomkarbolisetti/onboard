'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'

export function Toaster() {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: 'wyra-toast',
          title: 'wyra-toast-title',
          description: 'wyra-toast-description',
          success: 'wyra-toast-success',
          error: 'wyra-toast-error',
          closeButton: 'wyra-toast-close',
        },
      }}
    />
  )
}
