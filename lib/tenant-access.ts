import type { Tenant } from '@/types/models'

import { syncAppUserFromClerk } from '@/lib/app-user'
import { isPlatformSuperAdminUserId } from '@/lib/platform-role'
import { syncTenantMembership, type TenantAppRole } from '@/lib/tenant-membership'

/**
 * Resolves workspace access: org members use Clerk org + tenant_members;
 * platform super admins get tenant_admin in any workspace without org membership.
 */
export async function resolveTenantAccess(
  clerkUserId: string,
  tenant: Tenant,
): Promise<{ dbUserId: string; role: TenantAppRole } | null> {
  if (await isPlatformSuperAdminUserId(clerkUserId)) {
    const appUser = await syncAppUserFromClerk(clerkUserId)
    if (!appUser) return null
    return { dbUserId: appUser.id, role: 'tenant_admin' }
  }

  const synced = await syncTenantMembership(clerkUserId, tenant)
  if (!synced) return null
  return { dbUserId: synced.userId, role: synced.role }
}
