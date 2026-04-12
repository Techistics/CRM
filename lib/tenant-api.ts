import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'

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
        {
          error:
            'Missing workspace context. Open the app from your workspace URL (e.g. slug.yourdomain.com or /t/your-slug/...).',
        },
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
  const actor = await resolveTenantAccess(userId, t.tenant)
  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return {
    ok: true,
    tenant: t.tenant,
    dbUserId: actor.dbUserId,
    role: actor.role,
  }
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
