import type { TenantAppRole } from '@/lib/tenant-membership'

/** Scope context for tenant data access (leads, analytics, kanban). */
export type MemberScope = {
  role: TenantAppRole
  dbUserId: string
  customRoleId: string | null
}

export function toMemberScope(input: {
  role: TenantAppRole
  dbUserId: string
  customRoleId?: string | null
}): MemberScope {
  return {
    role: input.role,
    dbUserId: input.dbUserId,
    customRoleId: input.customRoleId ?? null,
  }
}

/** ADMIN role → tenant-wide access for granted permissions. */
export function hasElevatedScope(scope: MemberScope): boolean {
  return scope.role === 'ADMIN'
}

export function canViewAllAnalytics(scope: MemberScope): boolean {
  return hasElevatedScope(scope)
}
