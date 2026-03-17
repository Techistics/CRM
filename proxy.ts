import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/no-role',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isProRoute = createRouteMatcher(['/pro(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string })?.role
  const url = req.nextUrl.pathname

  // Always allow public routes
  if (isPublicRoute(req)) return NextResponse.next()

  // Not logged in → sign in
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // Logged in, hitting root → redirect by role
  if (url === '/') {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/overview', req.url))
    if (role === 'pro') return NextResponse.redirect(new URL('/pro/overview', req.url))
    return NextResponse.redirect(new URL('/no-role', req.url))
  }

  // Wrong portal access
  if (isAdminRoute(req) && role !== 'admin') {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
  if (isProRoute(req) && role !== 'pro') {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}