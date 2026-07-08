import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth'
import {
  tenantSlugFromHost,
  tenantSlugFromPathname,
  tenantSlugFromReferer,
} from '@/lib/tenant-host'

const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/no-role',
  '/no-access',
  '/api/auth',
  '/api/invite/accept',
  '/forgot-password',
  '/reset-password',
  '/invite/accept',
  '/accept-invite',
  '/platform/sign-in',
  '/platform',
  '/api/dev',
]


export default async function proxy(req: NextRequest) {
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
    nextHeaders.set('x-pathname', pathname)
  }
  nextHeaders.set('x-pathname', pathname);

  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // 1. JWT existence check
  const session = req.cookies.get('session')?.value
  const payload = session ? await decrypt(session) : null

  // 2. Strict Redirection logic
  // If NOT public and NO valid JWT -> redirect to /sign-in (or 401 for APIs)
  if (!isPublicRoute && !payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/sign-in'
    loginUrl.searchParams.set('redirect', pathname + loginUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // If public AND signed in -> redirect to dashboard (prevent double sign-in)
  // ONLY for /sign-in and /sign-up
  if (payload && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const homeUrl = req.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  // Tenant rewrites
  const shouldSkipTenantRewrite =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    isPublicRoute ||
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

  return NextResponse.next({ request: { headers: nextHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
