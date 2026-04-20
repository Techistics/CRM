import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { tenantMembers } from '@/db/schema'

export type TenantAppRole = 'ADMIN' | 'PRO'

/**
 * Resolves the role for a user in a specific tenant (workspace).
 */
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
        isNull(tenantMembers.deletedAt)
      ),
    )
  return (row?.role as TenantAppRole) ?? null
}

/** 
 * Mocking legacy sync function to avoid breaking other files immediately.
 * In a pure custom auth system, membership is managed via our own invite/admin tools.
 */
export async function syncTenantMembership(
  dbUserId: string,
  tenant: { id: string },
): Promise<{ userId: string; role: TenantAppRole } | null> {
  const role = await getTenantMembership(dbUserId, tenant.id)
  if (!role) return null
  return { userId: dbUserId, role }
}
