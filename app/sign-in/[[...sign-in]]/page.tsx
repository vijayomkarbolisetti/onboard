'use client'

import { SignIn } from '@clerk/nextjs'
import { WyraLogo } from '@/components/WyraLogo'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <WyraLogo priority width={160} height={48} />
        <p className="mt-3 text-center text-sm text-theme-muted">Sign in to Wyra Client Tracker</p>
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
        appearance={{
          variables: {
            colorPrimary: '#1fcc9a',
            borderRadius: '0.75rem',
          },
        }}
      />
    </div>
  )
}
