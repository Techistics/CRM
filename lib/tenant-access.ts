import type { Tenant } from '@/types/models'
import { getAppUser } from '@/lib/app-user'
import { isPlatformSuperAdminUserId } from '@/lib/platform-role'
import { getTenantMembership, type TenantAppRole } from '@/lib/tenant-membership'

/**
 * Resolves workspace access.
 * Platform super admins have unrestricted access.
 * Regular users must have a row in tenant_members.
 */
export async function resolveTenantAccess(
  userId: string,
  tenant: Tenant,
): Promise<{ dbUserId: string; role: TenantAppRole } | null> {
  // 1. Regular tenant membership check (Explicit roles take priority)
  const role = await getTenantMembership(userId, tenant.id)
  if (role) {
    return { dbUserId: userId, role }
  }

  // 2. Fallback: Check for platform-wide Super Admin role (Ghost Admin)
  if (await isPlatformSuperAdminUserId(userId)) {
    return { dbUserId: userId, role: 'ADMIN' }
  }

  return null
}
