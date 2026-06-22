import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/accept-invitation(.*)',
  '/session-tasks(.*)',
])

const isSessionTaskRoute = createRouteMatcher(['/session-tasks(.*)'])

const isOrgBootstrapApi = createRouteMatcher(['/api/team/organization'])

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith('/sign-in/tasks/choose-organization')) {
    const url = request.nextUrl.clone()
    url.pathname = '/session-tasks/choose-organization'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isPublicRoute(request)) {
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
