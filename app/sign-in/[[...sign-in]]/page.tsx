'use client'

import { ClerkLoaded } from '@clerk/nextjs'
import { useSignIn } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { WyraLogo } from '@/components/WyraLogo'

type SignInStep = 'login' | 'code' | 'mfa'

function getClerkErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0]
    return first?.longMessage ?? first?.message ?? 'Something went wrong. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

function SignInShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('light')

    return () => {
      const stored = localStorage.getItem('wyra-theme')
      document.documentElement.classList.toggle('light', stored === 'light')
    }
  }, [])

  return (
    <div className="auth-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center">
        <WyraLogo
          priority
          width={160}
          height={48}
          className="h-12 w-auto max-w-full object-contain"
        />
        <p className="mt-3 text-center text-sm text-theme-muted">
          Sign in to Wyra Client Tracker
        </p>
      </div>
      {children}
    </div>
  )
}

function WyraSignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, fetchStatus } = useSignIn()

  const [step, setStep] = useState<SignInStep>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [ticketHandled, setTicketHandled] = useState(false)

  const isSubmitting = fetchStatus === 'fetching'

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          const taskUrl = decorateUrl('/session-tasks/choose-organization')
          if (taskUrl.startsWith('http')) {
            window.location.href = taskUrl
          } else {
            router.push(taskUrl)
          }
          return
        }

        const homeUrl = decorateUrl('/')
        if (homeUrl.startsWith('http')) {
          window.location.href = homeUrl
        } else {
          router.push(homeUrl)
        }
      },
    })
  }

  const completeSignInIfReady = async () => {
    if (signIn.status === 'complete') {
      await finalizeSignIn()
      return true
    }

    if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === 'email_code',
      )
      if (emailCodeFactor) {
        const { error } = await signIn.mfa.sendEmailCode()
        if (error) {
          setFormError(getClerkErrorMessage(error))
          return true
        }
        setStep('mfa')
        return true
      }
    }

    return false
  }

  useEffect(() => {
    const ticket = searchParams.get('__clerk_ticket')
    if (!ticket || ticketHandled) {
      return
    }

    setTicketHandled(true)

    void (async () => {
      setFormError(null)
      const { error } = await signIn.ticket({ ticket })
      if (error) {
        setFormError(getClerkErrorMessage(error))
        return
      }

      await completeSignInIfReady()
    })()
  }, [searchParams, signIn, ticketHandled])

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFormError('Please enter your email address.')
      return
    }

    if (!password) {
      setFormError('Please enter your password.')
      return
    }

    const { error } = await signIn.password({
      emailAddress: trimmedEmail,
      password,
    })
    if (error) {
      setFormError(getClerkErrorMessage(error))
      return
    }

    const handled = await completeSignInIfReady()
    if (!handled && signIn.status !== 'complete') {
      setFormError('Additional verification is required. Please contact your administrator.')
    }
  }

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!code.trim()) {
      setFormError('Please enter the verification code.')
      return
    }

    const verify =
      step === 'mfa'
        ? signIn.mfa.verifyEmailCode({ code: code.trim() })
        : signIn.emailCode.verifyCode({ code: code.trim() })

    const { error } = await verify
    if (error) {
      setFormError(getClerkErrorMessage(error))
      return
    }

    const handled = await completeSignInIfReady()
    if (!handled && signIn.status === 'complete') {
      await finalizeSignIn()
    } else if (!handled) {
      setFormError('Verification could not be completed. Please try again.')
    }
  }

  const stepTitle =
    step === 'login'
      ? 'Sign in to Wyra Client Tracker'
      : 'Check your email'

  const stepSubtitle =
    step === 'login'
      ? 'Welcome back! Please sign in to continue'
      : `We sent a verification code to ${email}`

  return (
    <div className="glass-card w-full max-w-md p-8">
      <h1 className="text-xl font-bold text-theme-fg">{stepTitle}</h1>
      <p className="mt-2 text-sm text-theme-muted">{stepSubtitle}</p>

      {formError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      {step === 'login' ? (
        <form className="mt-6 space-y-5" onSubmit={handleLoginSubmit}>
          <div>
            <label htmlFor="email" className="wyra-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              className="wyra-input mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="password" className="wyra-label">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="wyra-input pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-theme-muted transition hover:text-theme-fg"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-wyra w-full">
            {isSubmitting ? 'Signing in...' : 'Continue'}
            {!isSubmitting ? <ChevronRight size={16} /> : null}
          </button>
        </form>
      ) : null}

      {step === 'code' || step === 'mfa' ? (
        <form className="mt-6 space-y-5" onSubmit={handleCodeSubmit}>
          <div>
            <label htmlFor="code" className="wyra-label">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter verification code"
              className="wyra-input mt-2"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-wyra w-full">
            {isSubmitting ? 'Verifying...' : 'Verify and continue'}
            {!isSubmitting ? <ChevronRight size={16} /> : null}
          </button>
          <button
            type="button"
            className="w-full text-sm text-theme-muted transition hover:text-theme-fg"
            onClick={() => {
              setStep('login')
              setCode('')
              setFormError(null)
            }}
            disabled={isSubmitting}
          >
            Use a different email
          </button>
        </form>
      ) : null}
    </div>
  )
}

export default function SignInPage() {
  return (
    <SignInShell>
      <ClerkLoaded>
        <Suspense
          fallback={
            <div className="glass-card w-full max-w-md p-8 text-center text-sm text-theme-muted">
              Loading sign in...
            </div>
          }
        >
          <WyraSignInForm />
        </Suspense>
      </ClerkLoaded>
    </SignInShell>
  )
}
