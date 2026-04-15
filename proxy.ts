import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import {
  tenantSlugFromHost,
  tenantSlugFromPathname,
  tenantSlugFromReferer,
} from '@/lib/tenant-host'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'crm_session'

const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/no-role',
  '/no-access',
  '/platform',
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()
  const host = req.headers.get('host') || ''
  const pathname = url.pathname

  // ── Resolve tenant slug (your existing logic, untouched) ──
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

  // ── Skip rewrites for system paths ──
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

  // ── Rewrite subdomain → /t/[slug] (your existing logic, untouched) ──
  if (
    hostSlug &&
    !shouldSkipTenantRewrite &&
    !pathname.startsWith(`/t/${hostSlug}`)
  ) {
    url.pathname =
      pathname === '/' ? `/t/${hostSlug}` : `/t/${hostSlug}${pathname}`
    return NextResponse.rewrite(url, { request: { headers: nextHeaders } })
  }

  // ── Redirect if accessing admin/pro without a tenant ──
  if (
    !headerSlug &&
    (pathname.startsWith('/admin') || pathname.startsWith('/pro'))
  ) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // ── Allow public routes without auth ──
  if (isPublic(pathname)) {
    return NextResponse.next({ request: { headers: nextHeaders } })
  }

  // ── Skip JWT check for API routes (handled in route handlers) ──
  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request: { headers: nextHeaders } })
  }

  // ── JWT verification (replaces Clerk's auth check) ──
  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next({ request: { headers: nextHeaders } })
  } catch {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}