import type { TenantAppRole } from '@/lib/tenant-membership'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { customRoles } from '@/db/schema'
import { sanitizePermissions, type Permission } from '@/lib/authz'

export function isWorkspaceAdmin(role: TenantAppRole): boolean {
  return role === 'ADMIN'
}

/** Non-admins can invite PRO members; custom-role assignments require Manage Access. */
export function validateTeamInviteForActor(
  actorRole: TenantAppRole,
  inviteRole: TenantAppRole,
  customRoleId: string | null | undefined,
  actorPermissions: Permission[] = [],
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  if (inviteRole === 'ADMIN') {
    return 'Only workspace admins can invite or assign the admin role'
  }
  if (customRoleId && !actorPermissions.includes('teams.manage_access')) {
    return 'You need Manage Access permission to assign custom roles'
  }
  return null
}

/** A non-admin may only grant custom-role permissions they already hold. */
export function validateCustomRolePermissionsForActor(
  actorRole: TenantAppRole,
  actorPermissions: Permission[],
  rolePermissions: Permission[],
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  const heldPermissions = new Set(actorPermissions)
  if (rolePermissions.some((permission) => !heldPermissions.has(permission))) {
    return 'You cannot assign permissions you do not have'
  }
  return null
}

/** Validates a selected custom role against the actor's current effective permissions. */
export async function validateCustomRoleAssignmentForActor(
  tenantId: string,
  actorRole: TenantAppRole,
  actorPermissions: Permission[],
  customRoleId: string | null | undefined,
): Promise<string | null> {
  if (!customRoleId || isWorkspaceAdmin(actorRole)) return null

  const [role] = await db
    .select({ permissions: customRoles.permissions })
    .from(customRoles)
    .where(and(eq(customRoles.id, customRoleId), eq(customRoles.tenantId, tenantId)))
    .limit(1)

  if (!role) return 'Invalid custom role for this workspace'
  return validateCustomRolePermissionsForActor(
    actorRole,
    actorPermissions,
    sanitizePermissions(role.permissions),
  )
}

/** Non-admin team managers may manage PRO roles and custom-role assignments, not ADMINs or themselves. */
export function validateTeamMemberUpdateForActor(
  actorRole: TenantAppRole,
  targetCurrentRole: TenantAppRole,
  nextRole: TenantAppRole,
  nextCustomRoleId: string | null | undefined,
  currentCustomRoleId: string | null | undefined,
  actorPermissions: Permission[] = [],
  isActorTarget = false,
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  if (isActorTarget && (nextRole !== targetCurrentRole || nextCustomRoleId !== currentCustomRoleId)) {
    return 'You cannot change your own role'
  }
  if (targetCurrentRole === 'ADMIN') {
    return 'You cannot modify workspace admins'
  }
  if (targetCurrentRole !== 'PRO' || nextRole !== 'PRO') {
    return 'You can only manage counselor (PRO) members'
  }
  if (
    nextCustomRoleId !== currentCustomRoleId &&
    !actorPermissions.includes('teams.manage_access')
  ) {
    return 'You need Manage Access permission to change custom roles'
  }
  return null
}

export function validateTeamMemberRemoveForActor(
  actorRole: TenantAppRole,
  targetRole: TenantAppRole,
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  if (targetRole === 'ADMIN') {
    return 'You cannot remove workspace admins'
  }
  return null
}
