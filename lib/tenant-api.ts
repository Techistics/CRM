import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq, and, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenants, auditLogs } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'
import { can, type Permission } from '@/lib/authz'

export type TenantMemberContext = {
  tenant: Tenant
  dbUserId: string
  role: TenantAppRole
  permissions: Permission[]
}

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
            'Missing workspace context. Open the app from your workspace URL.',
        },
        { status: 400 },
      ),
    }
  }
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))

  if (!tenant || tenant.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }),
    }
  }
  return { ok: true, tenant }
}

export async function requireTenantMemberApi(): Promise<
  | { ok: true } & TenantMemberContext
  | { ok: false; response: NextResponse }
> {
  const t = await requireTenantFromApiHeaders()
  if (!t.ok) return t

  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const actor = await resolveTenantAccess(session.userId, t.tenant)
  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  if (session.globalRole === 'SUPER_ADMIN') {
    await db.insert(auditLogs).values({
      actorUserId: session.userId,
      tenantId: t.tenant.id,
      action: 'SUPER_ADMIN_ACTION',
      metadata: { bypass: true, path: 'requireTenantMemberApi' },
    })
  }

  return {
    ok: true,
    tenant: t.tenant,
    dbUserId: actor.dbUserId,
    role: actor.role,
    permissions: actor.permissions,
  }
}

export async function requireTenantAdminApi(): Promise<
  | { ok: true } & TenantMemberContext
  | { ok: false; response: NextResponse }
> {
  const m = await requireTenantMemberApi()
  if (!m.ok) return m

  if (m.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return m
}

export async function requirePermissionApi(
  permission: Permission,
): Promise<
  | { ok: true } & TenantMemberContext
  | { ok: false; response: NextResponse }
> {
  const m = await requireTenantMemberApi()
  if (!m.ok) return m

  if (!can(m.permissions, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You do not have permission for this action', code: 'FORBIDDEN' },
        { status: 403 },
      ),
    }
  }
  return m
}

export async function requireLeadViewApi() {
  return requirePermissionApi('leads.view')
}

export async function requireLeadEditApi() {
  return requirePermissionApi('leads.edit')
}
