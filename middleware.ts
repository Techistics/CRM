import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import {
  tenantSlugFromHost,
  tenantSlugFromPathname,
  tenantSlugFromReferer,
} from '@/lib/tenant-host'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/no-role',
  '/no-access(.*)',
  '/platform(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone()
  const host = req.headers.get('host') || ''
  const pathname = url.pathname

  const hostSlug = tenantSlugFromHost(host)
  const pathSlug = tenantSlugFromPathname(pathname)
  let headerSlug = hostSlug ?? pathSlug

  if (!headerSlug && pathname.startsWith('/api')) {
    headerSlug = tenantSlugFromReferer(req.headers.get('referer'))
  }

  const nextHeaders = new Headers(req.headers)
  if (headerSlug) {
    nextHeaders.set('x-tenant-slug', headerSlug)
  }

  if (
    url.searchParams.has('__clerk_ticket') &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up')
  ) {
    const status = url.searchParams.get('__clerk_status')
    url.pathname = status === 'sign_up' ? '/sign-up' : '/sign-in'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request: { headers: nextHeaders } })
  }

  const shouldSkipTenantRewrite =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/request-role') ||
    pathname.startsWith('/no-access') ||
    pathname.startsWith('/no-role') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/t/')

  if (
    hostSlug &&
    !shouldSkipTenantRewrite &&
    !pathname.startsWith(`/t/${hostSlug}`)
  ) {
    url.pathname =
      pathname === '/' ? `/t/${hostSlug}` : `/t/${hostSlug}${pathname}`
    return NextResponse.rewrite(url, { request: { headers: nextHeaders } })
  }

  if (
    !headerSlug &&
    (pathname.startsWith('/admin') || pathname.startsWith('/pro'))
  ) {
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
