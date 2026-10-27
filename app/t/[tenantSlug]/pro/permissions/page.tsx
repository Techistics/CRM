import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { customRoles } from '@/db/schema'
import { sanitizePermissions } from '@/lib/authz'
import { requirePermissionSession } from '@/lib/tenant-server'
import { validateCustomRolePermissionsForActor } from '@/lib/team-access'
import PermissionsClient from '../../admin/permissions/PermissionsClient'

export default async function ProPermissionsPage() {
  const ctx = await requirePermissionSession('teams.manage_access')
  const { tenant } = ctx
  const roles = await db
    .select()
    .from(customRoles)
    .where(eq(customRoles.tenantId, tenant.id))
  const manageableRoles = roles.filter((role) => (
    role.id !== ctx.customRoleId &&
    !validateCustomRolePermissionsForActor(
      ctx.role,
      ctx.permissions,
      sanitizePermissions(role.permissions),
    )
  ))

  return (
    <PermissionsClient
      initialRoles={manageableRoles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: sanitizePermissions(role.permissions),
      }))}
    />
  )
}
