import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { tenantMembers, customRoles } from '@/db/schema'
import {
  resolveMemberPermissions,
  sanitizePermissions,
  type Permission,
} from '@/lib/authz'

export type TenantAppRole = 'ADMIN' | 'PRO'

export async function getTenantMembership(
  dbUserId: string,
  tenantId: string,
): Promise<TenantAppRole | null> {
  const [row] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(
      eq(tenantMembers.tenantId, tenantId),
      eq(tenantMembers.userId, dbUserId),
      isNull(tenantMembers.deletedAt)
    ))
  return (row?.role as TenantAppRole) ?? null
}

export async function getTenantMembershipWithPermissions(
  dbUserId: string,
  tenantId: string,
): Promise<{ role: TenantAppRole; permissions: Permission[]; customRoleId: string | null } | null> {
  const [row] = await db
    .select({
      role: tenantMembers.role,
      customRoleId: tenantMembers.customRoleId,
    })
    .from(tenantMembers)
    .where(and(
      eq(tenantMembers.tenantId, tenantId),
      eq(tenantMembers.userId, dbUserId),
      isNull(tenantMembers.deletedAt)
    ))

  if (!row) return null

  let customRolePermissions: Permission[] | null = null
  if (row.customRoleId) {
    const roleRow = await db.query.customRoles.findFirst({
      where: eq(customRoles.id, row.customRoleId),
      columns: { permissions: true },
    })
    customRolePermissions = sanitizePermissions(roleRow?.permissions)
  }

  return {
    role: row.role as TenantAppRole,
    permissions: resolveMemberPermissions(row.role as TenantAppRole, customRolePermissions),
    customRoleId: row.customRoleId,
  }
}

export async function syncTenantMembership(
  dbUserId: string,
  tenant: { id: string },
): Promise<{ userId: string; role: TenantAppRole } | null> {
  const role = await getTenantMembership(dbUserId, tenant.id)
  if (!role) return null
  return { userId: dbUserId, role }
}
