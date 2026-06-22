'use client'

import { ClerkLoaded } from '@clerk/nextjs'
import { useSignUp } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { WyraLogo } from '@/components/WyraLogo'

type SignUpStep = 'loading' | 'details' | 'code'

function getClerkErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0]
    return first?.longMessage ?? first?.message ?? 'Something went wrong. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

function SignUpShell({ children }: { children: React.ReactNode }) {
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
          Create your Wyra Client Tracker account
        </p>
      </div>
      {children}
    </div>
  )
}

function WyraSignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, fetchStatus } = useSignUp()

  const ticket = searchParams.get('__clerk_ticket')
  const accountStatus = searchParams.get('__clerk_status')

  const [step, setStep] = useState<SignUpStep>('loading')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [ticketHandled, setTicketHandled] = useState(false)

  const isSubmitting = fetchStatus === 'fetching'
  const missingFields = signUp.missingFields ?? []
  const needsPassword = missingFields.includes('password')
  const needsFirstName = missingFields.includes('first_name')
  const needsLastName = missingFields.includes('last_name')
  const needsLegalAccepted = missingFields.includes('legal_accepted')
  const [legalAccepted, setLegalAccepted] = useState(false)

  const finalizeSignUp = async () => {
    await signUp.finalize({
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

  const completeSignUpIfReady = async () => {
    if (signUp.status === 'complete') {
      await finalizeSignUp()
      return true
    }

    const unverifiedFields = signUp.unverifiedFields ?? []
    const currentMissingFields = signUp.missingFields ?? []
    if (
      signUp.status === 'missing_requirements' &&
      unverifiedFields.includes('email_address') &&
      currentMissingFields.length === 0
    ) {
      const { error } = await signUp.verifications.sendEmailCode()
      if (error) {
        setFormError(getClerkErrorMessage(error))
        return true
      }
      setStep('code')
      return true
    }

    return false
  }

  useEffect(() => {
    if (!ticket) {
      router.replace('/sign-in')
      return
    }

    if (accountStatus === 'sign_in') {
      router.replace(`/sign-in?${searchParams.toString()}`)
      return
    }

    if (accountStatus === 'complete') {
      router.replace('/')
      return
    }

    if (ticketHandled) {
      return
    }

    setTicketHandled(true)

    void (async () => {
      setFormError(null)

      const { error } = await signUp.create({
        strategy: 'ticket',
        ticket,
      })

      if (error) {
        setFormError(getClerkErrorMessage(error))
        setStep('details')
        return
      }

      const handled = await completeSignUpIfReady()
      if (!handled) {
        setStep('details')
      }
    })()
  }, [ticket, accountStatus, ticketHandled, searchParams, router, signUp])

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (needsPassword && !password) {
      setFormError('Please create a password.')
      return
    }

    if (needsFirstName && !firstName.trim()) {
      setFormError('Please enter your first name.')
      return
    }

    if (needsLastName && !lastName.trim()) {
      setFormError('Please enter your last name.')
      return
    }

    if (needsLegalAccepted && !legalAccepted) {
      setFormError('Please accept the terms to continue.')
      return
    }

    const updates: {
      password?: string
      firstName?: string
      lastName?: string
      legalAccepted?: boolean
    } = {}

    if (needsPassword) {
      updates.password = password
    }
    if (needsFirstName) {
      updates.firstName = firstName.trim()
    }
    if (needsLastName) {
      updates.lastName = lastName.trim()
    }
    if (needsLegalAccepted) {
      updates.legalAccepted = true
    }

    const { error } = await signUp.update(updates)
    if (error) {
      setFormError(getClerkErrorMessage(error))
      return
    }

    const handled = await completeSignUpIfReady()
    if (!handled && signUp.status === 'complete') {
      await finalizeSignUp()
    } else if (!handled && signUp.status === 'missing_requirements') {
      setFormError('Additional details are required. Please contact your administrator.')
    }
  }

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!code.trim()) {
      setFormError('Please enter the verification code.')
      return
    }

    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() })
    if (error) {
      setFormError(getClerkErrorMessage(error))
      return
    }

    const handled = await completeSignUpIfReady()
    if (!handled && signUp.status === 'complete') {
      await finalizeSignUp()
    } else if (!handled) {
      setFormError('Verification could not be completed. Please try again.')
    }
  }

  if (!ticket) {
    return null
  }

  if (step === 'loading') {
    return (
      <div className="glass-card w-full max-w-md p-8 text-center text-sm text-theme-muted">
        Preparing your invitation...
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-theme-fg">Verify your email</h1>
        <p className="mt-2 text-sm text-theme-muted">
          Enter the verification code sent to your email to finish setting up your account.
        </p>

        {formError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        ) : null}

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
        </form>
      </div>
    )
  }

  return (
    <div className="glass-card w-full max-w-md p-8">
      <h1 className="text-xl font-bold text-theme-fg">Complete your account</h1>
      <p className="mt-2 text-sm text-theme-muted">
        You&apos;ve been invited to Wyra Client Tracker. Fill in the remaining details to continue.
      </p>

      {formError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <form className="mt-6 space-y-5" onSubmit={handleDetailsSubmit}>
        {needsFirstName ? (
          <div>
            <label htmlFor="firstName" className="wyra-label">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Enter your first name"
              className="wyra-input mt-2"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        ) : null}

        {needsLastName ? (
          <div>
            <label htmlFor="lastName" className="wyra-label">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Enter your last name"
              className="wyra-input mt-2"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        ) : null}

        {needsPassword ? (
          <div>
            <label htmlFor="password" className="wyra-label">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
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
        ) : null}

        {needsLegalAccepted ? (
          <label className="flex items-start gap-3 text-sm text-theme-body">
            <input
              type="checkbox"
              className="mt-1"
              checked={legalAccepted}
              onChange={(event) => setLegalAccepted(event.target.checked)}
              disabled={isSubmitting}
            />
            <span>I agree to the terms required to create my account.</span>
          </label>
        ) : null}

        <button type="submit" disabled={isSubmitting} className="btn-wyra w-full">
          {isSubmitting ? 'Continuing...' : 'Continue'}
          {!isSubmitting ? <ChevronRight size={16} /> : null}
        </button>
      </form>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <SignUpShell>
      <ClerkLoaded>
        <Suspense
          fallback={
            <div className="glass-card w-full max-w-md p-8 text-center text-sm text-theme-muted">
              Loading invitation...
            </div>
          }
        >
          <WyraSignUpForm />
        </Suspense>
      </ClerkLoaded>
    </SignUpShell>
  )
}
