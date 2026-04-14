import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'

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
  if (!slug) redirect('/')
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()
  return tenant
}

export async function requireTenantSession(): Promise<{
  tenant: Tenant
  dbUserId: string
  role: TenantAppRole
}> {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const tenant = await requireTenantFromHeaders()

  const actor = await resolveTenantAccess(tenant)
  if (!actor) redirect('/no-access?reason=not-in-org')

  return { tenant, dbUserId: actor.dbUserId, role: actor.role }
}

export async function requireTenantAdminSession() {
  const ctx = await requireTenantSession()
  if (ctx.role !== 'tenant_admin') {
    redirect(`/t/${ctx.tenant.slug}/pro/overview`)
  }
  return ctx
}