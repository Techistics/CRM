import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'

type TenantOk = { ok: true; tenant: Tenant }
type TenantFail = { ok: false; response: NextResponse }
type TenantMemberOk = { ok: true; tenant: Tenant; dbUserId: string; role: TenantAppRole }

export async function requireTenantFromApiHeaders(): Promise<TenantOk | TenantFail> {
  const h = await headers()
  const slug = h.get('x-tenant-slug')
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing workspace context. Open the app from your workspace URL.' },
        { status: 400 },
      ),
    }
  }

  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug))

  if (!row || row.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }),
    }
  }

  return { ok: true, tenant: row }
}

export async function requireTenantMemberApi(): Promise<TenantMemberOk | TenantFail> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const t = await requireTenantFromApiHeaders()
  if (!t.ok) return t

  const actor = await resolveTenantAccess(t.tenant)
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

export async function requireTenantAdminApi(): Promise<TenantMemberOk | TenantFail> {
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