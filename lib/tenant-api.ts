import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { syncTenantMembership, type TenantAppRole } from '@/lib/tenant-membership'

export async function requireTenantFromApiHeaders(): Promise<
  | { ok: true; tenant: Tenant }
  | { ok: false; response: NextResponse }
> {
  const h = await headers()
  const slug = h.get('x-tenant-slug')
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Open the app from your workspace URL (subdomain).' },
        { status: 400 },
      ),
    }
  }
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  if (!tenant || tenant.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }),
    }
  }
  return { ok: true, tenant }
}

export async function requireTenantMemberApi(): Promise<
  | { ok: true; tenant: Tenant; dbUserId: string; role: TenantAppRole }
  | { ok: false; response: NextResponse }
> {
  const t = await requireTenantFromApiHeaders()
  if (!t.ok) return t
  const { userId } = await auth()
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const synced = await syncTenantMembership(userId, t.tenant)
  if (!synced) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { ok: true, tenant: t.tenant, dbUserId: synced.userId, role: synced.role }
}

export async function requireTenantAdminApi(): Promise<
  | { ok: true; tenant: Tenant; dbUserId: string; role: TenantAppRole }
  | { ok: false; response: NextResponse }
> {
  const m = await requireTenantMemberApi()
  if (!m.ok) return m
  if (m.role !== 'tenant_admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return m
}
