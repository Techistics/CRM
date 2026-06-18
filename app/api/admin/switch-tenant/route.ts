import { NextRequest, NextResponse } from 'next/server'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { tenants, auditLogs } from '@/db/schema'
import { getSession, encrypt } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.globalRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { tenantSlug } = body || {}
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 })
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, tenantSlug), isNull(tenants.deletedAt)))
    .limit(1)

  if (!tenant || tenant.status !== 'active') {
    return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 })
  }

  // Re-issue session cookie
  // Set superAdminActiveTenantId and tenantId to that tenant's ID
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h for SUPER_ADMIN
  
  const updatedPayload = {
    ...session,
    superAdminActiveTenantId: tenant.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: 'ADMIN' as const, // super admins act as ADMIN in resolved tenant access
    expiresAt,
  }

  const sessionToken = await encrypt(updatedPayload)

  // Writes audit log
  await db.insert(auditLogs).values({
    actorUserId: session.userId,
    tenantId: tenant.id,
    action: 'SUPER_ADMIN_ACTION',
    metadata: { event: 'tenant_switch', tenantId: tenant.id, tenantSlug: tenant.slug },
  })

  const response = NextResponse.json({ tenantSlug: tenant.slug, tenantId: tenant.id })
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
