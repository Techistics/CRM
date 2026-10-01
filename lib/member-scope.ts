import type { TenantAppRole } from '@/lib/tenant-membership'

/** Scope context for tenant data access (leads, analytics, kanban). */
export type MemberScope = {
  role: TenantAppRole
  dbUserId: string
  customRoleId: string | null
  permissions?: string[]
}

export function toMemberScope(input: {
  role: TenantAppRole
  dbUserId: string
  customRoleId?: string | null
  permissions?: string[]
}): MemberScope {
  return {
    role: input.role,
    dbUserId: input.dbUserId,
    customRoleId: input.customRoleId ?? null,
    permissions: input.permissions ?? [],
  }
}

/** 
 * ADMIN → always tenant-wide.
 * PRO with leads.assign (can reassign leads = should see all) or reports.view_all → tenant-wide.
 * Plain PRO counselor → only their own assigned leads.
 */
export function hasElevatedScope(scope: MemberScope): boolean {
  if (scope.role === 'ADMIN') return true
  const perms = scope.permissions ?? []
  return perms.includes('leads.assign') || perms.includes('reports.view_all')
}

export function canViewAllAnalytics(scope: MemberScope): boolean {
  return hasElevatedScope(scope)
}
