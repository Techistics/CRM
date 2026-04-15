import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { getSession } from '@/lib/auth'

export type TenantAppRole = 'tenant_admin' | 'agent'

/** Get the current user's role in a specific tenant from DB. */
export async function getTenantMembership(
  dbUserId: string,
  tenantId: string,
): Promise<TenantAppRole | null> {
  const [row] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, dbUserId),
      ),
    )
  return (row?.role as TenantAppRole) ?? null
}

/** Get membership from the current session (fast — no extra DB query). */
export async function getSessionMembership(): Promise<{
  userId: string
  tenantId: string
  tenantSlug: string
  role: TenantAppRole
} | null> {
  const session = await getSession()
  if (
    !session ||
    !session.tenantId ||
    !session.tenantSlug ||
    !session.role ||
    session.role === 'super_admin'
  ) {
    return null
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    role: session.role as TenantAppRole,
  }
}

/** @deprecated Clerk sync no longer needed — membership created on invite accept */
export async function syncTenantMembership() {
  return null
}