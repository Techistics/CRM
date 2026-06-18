import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { tenants, users } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'
import { can, forbiddenRedirect, type Permission } from '@/lib/authz'

export type TenantSessionContext = {
  tenant: Tenant
  dbUserId: string
  role: TenantAppRole
  permissions: Permission[]
  user: {
    name: string
    email: string
  }
}


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

/** Server guard: signed-in user with workspace context. */
export async function requireTenantSession(): Promise<TenantSessionContext> {
  const tenant = await requireTenantFromHeaders()
  const session = await getSession()
  
  if (!session) {
    redirect('/sign-in')
  }
  if (session.tenantId && session.tenantId !== tenant.id) {
  redirect('/sign-in?reason=wrong-tenant')
}

  const actor = await resolveTenantAccess(session.userId, tenant)
  if (!actor) {
    redirect('/no-access?reason=not-in-org')
  }

  // Fetch full user data for profile info
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, actor.dbUserId),
    columns: {
      name: true,
      email: true,
    }
  })

  return { 
    tenant, 
    dbUserId: actor.dbUserId, 
    role: actor.role,
    permissions: actor.permissions ?? [],
    user: userRow ?? { name: 'Unknown', email: 'unknown@example.com' }
  }
}

export async function requireTenantAdminSession(): Promise<TenantSessionContext> {
  const ctx = await requireTenantSession()
  if (ctx.role !== 'ADMIN') {
    redirect(forbiddenRedirect(ctx.tenant.slug, ctx.role))
  }
  return ctx
}

/** Require a specific permission; redirects if missing. */
export async function requirePermissionSession(
  permission: Permission,
): Promise<TenantSessionContext> {
  const ctx = await requireTenantSession()
  if (!can(ctx.permissions, permission)) {
    redirect(forbiddenRedirect(ctx.tenant.slug, ctx.role))
  }
  return ctx
}
