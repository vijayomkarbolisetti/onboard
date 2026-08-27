import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/accept-invitation(.*)',
  '/session-tasks(.*)',
])

const isAuthPage = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

const isSessionTaskRoute = createRouteMatcher(['/session-tasks(.*)'])

const isOrgBootstrapApi = createRouteMatcher(['/api/team/organization'])

function safeAppRedirect(request: Request, candidate: string | null): URL {
  const fallback = new URL('/', request.url)
  if (!candidate) return fallback
  try {
    const target = new URL(candidate, request.url)
    if (target.origin !== new URL(request.url).origin) return fallback
    if (target.pathname.startsWith('/sign-in') || target.pathname.startsWith('/sign-up')) {
      return fallback
    }
    return target
  } catch {
    return fallback
  }
}

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith('/sign-in/tasks/choose-organization')) {
    const url = request.nextUrl.clone()
    url.pathname = '/session-tasks/choose-organization'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isPublicRoute(request)) {
    // Already signed in → skip auth pages and go into the app
    if (isAuthPage(request) && !request.nextUrl.searchParams.has('__clerk_ticket')) {
      const { userId, sessionStatus } = await auth({ treatPendingAsSignedOut: false })
      if (userId) {
        if (sessionStatus === 'pending') {
          const url = request.nextUrl.clone()
          url.pathname = '/session-tasks/choose-organization'
          url.search = ''
          return NextResponse.redirect(url)
        }
        return NextResponse.redirect(
          safeAppRedirect(request, request.nextUrl.searchParams.get('redirect_url')),
        )
      }
    }
    return
  }

  const authObject = await auth({ treatPendingAsSignedOut: false })
  const { userId, sessionStatus } = authObject

  if (
    sessionStatus === 'pending' &&
    !isSessionTaskRoute(request) &&
    !isOrgBootstrapApi(request)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/session-tasks/choose-organization'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!userId) {
    const accept = request.headers.get('accept') ?? ''
    if (accept.includes('text/x-component')) {
      return
    }

    return authObject.redirectToSignIn({ returnBackUrl: request.url })
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
