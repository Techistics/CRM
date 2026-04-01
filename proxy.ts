import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { tenantSlugFromHost } from '@/lib/tenant-host'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/no-role',
  '/no-access(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone()
  const host = req.headers.get('host') || ''
  const slug = tenantSlugFromHost(host)
  const pathname = url.pathname

  const nextHeaders = new Headers(req.headers)
  if (slug) {
    nextHeaders.set('x-tenant-slug', slug)
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request: { headers: nextHeaders } })
  }

  if (
    slug &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up') &&
    !pathname.startsWith('/request-role') &&
    !pathname.startsWith('/no-access') &&
    !pathname.startsWith(`/t/${slug}`)
  ) {
    url.pathname =
      pathname === '/' ? `/t/${slug}` : `/t/${slug}${pathname}`
    return NextResponse.rewrite(url, { request: { headers: nextHeaders } })
  }

  if (!slug && (pathname.startsWith('/admin') || pathname.startsWith('/pro'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (isPublicRoute(req)) {
    return NextResponse.next({ request: { headers: nextHeaders } })
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  return NextResponse.next({ request: { headers: nextHeaders } })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
