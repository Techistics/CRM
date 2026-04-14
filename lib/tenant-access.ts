import { getSession } from '@/lib/auth'
import { getTenantMembership, type TenantAppRole } from '@/lib/tenant-membership'
import type { Tenant } from '@/types/models'

/**
 * Resolves workspace access from session.
 * Super admins get tenant_admin in any workspace.
 * Regular users must have a tenant_members row.
 */
export async function resolveTenantAccess(
  tenant: Tenant,
): Promise<{ dbUserId: string; role: TenantAppRole } | null> {
  const session = await getSession()
  if (!session) return null

  // ── Super admin gets full access to any workspace ──
  if (session.role === 'super_admin') {
    return { dbUserId: session.userId, role: 'tenant_admin' }
  }

  // ── Regular user must be a member of this specific tenant ──
  if (session.tenantId !== tenant.id) return null

  const role = await getTenantMembership(session.userId, tenant.id)
  if (!role) return null

  return { dbUserId: session.userId, role }
}