import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/accept-invitation(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return
  }

  const authObject = await auth()
  const { userId } = authObject

  if (!userId) {
    const accept = request.headers.get('accept') ?? ''
    // During sign-out, Clerk/Next may issue RSC POSTs before redirect completes.
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
