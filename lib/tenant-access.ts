import type { Tenant } from '@/types/models'
import { isPlatformSuperAdminUserId } from '@/lib/platform-role'
import { getTenantMembershipWithPermissions, type TenantAppRole } from '@/lib/tenant-membership'
import { ALL_PERMISSIONS, type Permission } from '@/lib/authz'
import { getSession } from '@/lib/auth'

export async function resolveTenantAccess(
  userId: string,
  tenant: Tenant,
): Promise<{
  dbUserId: string
  role: TenantAppRole
  permissions: Permission[]
  customRoleId: string | null
} | null> {
  // ── Suspended workspace guard ────────────────────────────────────────────────
  // Compute SA bypass first (cheap session read, no extra DB query yet).
  if (tenant.status === 'suspended') {
    const session = await getSession()
    const saBypass =
      (await isPlatformSuperAdminUserId(userId)) &&
      session?.superAdminActiveTenantId === tenant.id
    if (!saBypass) {
      // Block real members and any non-bypassing caller from a suspended workspace.
      return null
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const result = await getTenantMembershipWithPermissions(userId, tenant.id)
  if (result) {
    return {
      dbUserId: userId,
      role: result.role,
      permissions: result.permissions,
      customRoleId: result.customRoleId,
    }
  }

  if (await isPlatformSuperAdminUserId(userId)) {
    const session = await getSession()
    if (session && session.superAdminActiveTenantId === tenant.id) {
      return {
        dbUserId: userId,
        role: 'ADMIN',
        permissions: [...ALL_PERMISSIONS],
        customRoleId: null,
      }
    }
  }

  return null
}
