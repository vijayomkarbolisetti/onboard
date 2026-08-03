'use client'

import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  useSignIn,
} from '@clerk/nextjs'
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

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

function getClerkErrorCode(error: unknown): string | undefined {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.code
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code
  }

  return undefined
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[#e8e6f0] bg-white p-8 shadow-sm">
      {children}
    </div>
  )
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
    <div className="auth-page flex min-h-screen flex-col items-center justify-center bg-[#f4f3fa] px-4 py-12">
      <div className="mb-8 flex flex-col items-center">
        <WyraLogo
          priority
          width={160}
          height={48}
          className="h-12 w-auto max-w-full object-contain"
        />
        <p className="mt-3 text-center text-sm text-[#5c5a78]">
          Sign in to Wyra Client Tracker
        </p>
      </div>
      {children}
    </div>
  )
}

function ClerkUnavailableMessage() {
  return (
    <AuthCard>
      <h1 className="text-xl font-bold text-[#241f5b]">Sign-in could not load</h1>
      <p className="mt-2 text-sm text-[#5c5a78]">
        Clerk authentication did not finish loading. If you use Brave (or another
        blocker), disable shields for{' '}
        <span className="font-medium text-[#241f5b]">localhost:3000</span>, then
        refresh.
      </p>
      <p className="mt-3 text-sm text-[#5c5a78]">
        Also confirm{' '}
        <code className="rounded bg-[#f4f3fa] px-1 py-0.5 text-xs">
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        </code>{' '}
        is set in <code className="rounded bg-[#f4f3fa] px-1 py-0.5 text-xs">.env.local</code>{' '}
        and restart <code className="rounded bg-[#f4f3fa] px-1 py-0.5 text-xs">npm run
        dev</code>.
      </p>
      <button
        type="button"
        className="btn-wyra mt-6 w-full"
        onClick={() => window.location.assign('/sign-in')}
      >
        Retry
        <ChevronRight size={16} />
      </button>
    </AuthCard>
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
  const [ticketLoading, setTicketLoading] = useState(false)

  const ticket = searchParams.get('__clerk_ticket')
  const clerkStatus = searchParams.get('__clerk_status')
  const isSubmitting = fetchStatus === 'fetching' || ticketLoading

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

  // Invitation tickets for new accounts belong on sign-up
  useEffect(() => {
    if (ticket && clerkStatus === 'sign_up') {
      router.replace(`/sign-up?${searchParams.toString()}`)
    }
  }, [ticket, clerkStatus, router, searchParams])

  useEffect(() => {
    if (!ticket || ticketHandled || clerkStatus === 'sign_up') {
      return
    }

    setTicketHandled(true)
    setTicketLoading(true)

    void (async () => {
      try {
        setFormError(null)
        const { error } = await signIn.ticket({ ticket })
        if (error) {
          const code = getClerkErrorCode(error)
          const message = getClerkErrorMessage(error).toLowerCase()
          if (
            code === 'invitation_not_found' ||
            code === 'form_identifier_not_found' ||
            code === 'ticket_expired' ||
            message.includes('sign up') ||
            message.includes('sign-up')
          ) {
            router.replace(`/sign-up?${searchParams.toString()}`)
            return
          }

          setFormError(
            `${getClerkErrorMessage(error)} You can also sign in with email and password below.`,
          )
          return
        }

        await completeSignInIfReady()
      } catch (err) {
        setFormError(
          `${getClerkErrorMessage(err)} You can sign in with email and password below.`,
        )
      } finally {
        setTicketLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot invite ticket handling
  }, [ticket, ticketHandled, clerkStatus, signIn])

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

    try {
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
        setFormError(
          'Additional verification is required. Please contact your administrator.',
        )
      }
    } catch (err) {
      setFormError(getClerkErrorMessage(err))
    }
  }

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!code.trim()) {
      setFormError('Please enter the verification code.')
      return
    }

    try {
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
    } catch (err) {
      setFormError(getClerkErrorMessage(err))
    }
  }

  const stepTitle =
    step === 'login' ? 'Sign in to Wyra Client Tracker' : 'Check your email'

  const stepSubtitle =
    step === 'login'
      ? ticket
        ? 'Accepting your invitation… or sign in with email below'
        : 'Welcome back! Please sign in to continue'
      : `We sent a verification code to ${email}`

  return (
    <AuthCard>
      <h1 className="text-xl font-bold text-[#241f5b]">{stepTitle}</h1>
      <p className="mt-2 text-sm text-[#5c5a78]">{stepSubtitle}</p>

      {ticketLoading ? (
        <p className="mt-4 rounded-lg border border-[#e8e6f0] bg-[#faf9ff] px-3 py-2 text-sm text-[#5c5a78]">
          Completing invitation sign-in…
        </p>
      ) : null}

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
                className="absolute top-1/2 right-3 -translate-y-1/2 text-[#5c5a78] transition hover:text-[#241f5b]"
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
            className="w-full text-sm text-[#5c5a78] transition hover:text-[#241f5b]"
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
    </AuthCard>
  )
}

export default function SignInPage() {
  return (
    <SignInShell>
      <ClerkLoading>
        <AuthCard>
          <p className="text-center text-sm text-[#5c5a78]">Loading sign in…</p>
        </AuthCard>
      </ClerkLoading>
      <ClerkFailed>
        <ClerkUnavailableMessage />
      </ClerkFailed>
      <ClerkLoaded>
        <Suspense
          fallback={
            <AuthCard>
              <p className="text-center text-sm text-[#5c5a78]">Loading sign in…</p>
            </AuthCard>
          }
        >
          <WyraSignInForm />
        </Suspense>
      </ClerkLoaded>
    </SignInShell>
  )
}
