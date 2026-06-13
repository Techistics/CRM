import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { customRoles } from '@/db/schema'
import type { TenantAppRole } from '@/lib/tenant-membership'

/** Returns null when valid; error message when invalid. */
export async function validateCustomRoleId(
  tenantId: string,
  memberRole: TenantAppRole,
  customRoleId?: string | null,
): Promise<string | null> {
  if (memberRole === 'ADMIN') {
    return customRoleId ? 'Custom roles apply to PRO members only' : null
  }
  if (!customRoleId) return null

  const [row] = await db
    .select({ id: customRoles.id })
    .from(customRoles)
    .where(and(eq(customRoles.id, customRoleId), eq(customRoles.tenantId, tenantId)))
    .limit(1)

  return row ? null : 'Invalid custom role for this workspace'
}
