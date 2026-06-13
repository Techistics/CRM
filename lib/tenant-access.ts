import type { Tenant } from '@/types/models'
import { isPlatformSuperAdminUserId } from '@/lib/platform-role'
import { getTenantMembershipWithPermissions, type TenantAppRole } from '@/lib/tenant-membership'
import { ALL_PERMISSIONS, type Permission } from '@/lib/authz'

export async function resolveTenantAccess(
  userId: string,
  tenant: Tenant,
): Promise<{ dbUserId: string; role: TenantAppRole; permissions: Permission[] } | null> {
  const result = await getTenantMembershipWithPermissions(userId, tenant.id)
  if (result) {
    return {
      dbUserId: userId,
      role: result.role,
      permissions: result.permissions,
    }
  }

  if (await isPlatformSuperAdminUserId(userId)) {
    return {
      dbUserId: userId,
      role: 'ADMIN',
      permissions: [...ALL_PERMISSIONS],
    }
  }

  return null
}
