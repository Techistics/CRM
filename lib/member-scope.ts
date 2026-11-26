import type { TenantAppRole } from '@/lib/tenant-membership'

/** Scope context for tenant data access. */
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

/** ADMINs and members explicitly granted leads.view_all can see all tenant leads. */
export function hasTenantWideLeadAccess(scope: MemberScope): boolean {
  if (scope.role === 'ADMIN') return true
  return (scope.permissions ?? []).includes('leads.view_all')
}

export function canViewAllAnalytics(scope: MemberScope): boolean {
  if (scope.role === 'ADMIN') return true
  return (scope.permissions ?? []).includes('analytics.view')
}

export function canViewAllReports(scope: MemberScope): boolean {
  if (scope.role === 'ADMIN') return true
  return (scope.permissions ?? []).includes('reports.view_all')
}
