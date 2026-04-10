import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { syncTenantMembership, type TenantAppRole } from '@/lib/tenant-membership'
import { auth } from '@clerk/nextjs/server'

export async function getTenantSlugFromHeaders(): Promise<string | null> {
  const h = await headers()
  return h.get('x-tenant-slug')
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  return row ?? null
}

export async function requireTenantFromHeaders(): Promise<Tenant> {
  const slug = await getTenantSlugFromHeaders()
  if (!slug) {
    redirect('/')
  }
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') {
    notFound()
  }
  return tenant
}

/** Server guard: must be on tenant host + org member. */
export async function requireTenantSession(): Promise<{
  tenant: Tenant
  dbUserId: string
  role: TenantAppRole
}> {
  const tenant = await requireTenantFromHeaders()
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const synced = await syncTenantMembership(userId, tenant)
  if (!synced) {
    redirect('/no-access?reason=not-in-org')
  }

  return { tenant, dbUserId: synced.userId, role: synced.role }
}

export async function requireTenantAdminSession() {
  const ctx = await requireTenantSession()
  if (ctx.role !== 'tenant_admin') {
    redirect('/pro/overview')
  }
  return ctx
}
