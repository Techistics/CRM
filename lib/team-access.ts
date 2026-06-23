import type { TenantAppRole } from '@/lib/tenant-membership'

export function isWorkspaceAdmin(role: TenantAppRole): boolean {
  return role === 'ADMIN'
}

/** PRO users with teams.manage may only invite other PRO members without custom roles. */
export function validateTeamInviteForActor(
  actorRole: TenantAppRole,
  inviteRole: TenantAppRole,
  customRoleId: string | null | undefined,
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  if (inviteRole === 'ADMIN') {
    return 'Only workspace admins can invite or assign the admin role'
  }
  if (customRoleId) {
    return 'Only workspace admins can assign custom roles'
  }
  return null
}

/** PRO team managers may only edit PRO member emails — not roles or custom roles. */
export function validateTeamMemberUpdateForActor(
  actorRole: TenantAppRole,
  targetCurrentRole: TenantAppRole,
  nextRole: TenantAppRole,
  nextCustomRoleId: string | null | undefined,
  currentCustomRoleId: string | null | undefined,
): string | null {
  if (isWorkspaceAdmin(actorRole)) return null
  if (targetCurrentRole === 'ADMIN') {
    return 'You cannot modify workspace admins'
  }
  if (targetCurrentRole !== 'PRO' || nextRole !== 'PRO') {
    return 'You can only manage counselor (PRO) members'
  }
  if (nextCustomRoleId !== currentCustomRoleId) {
    return 'Only workspace admins can change custom roles'
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
