/**
 * Central authorization: permission catalog, checks, and route/feature mappings.
 * All server and client guards should import from here (or lib/permissions for types only).
 */
import {
  ALL_PERMISSIONS,
  DEFAULT_PRO_PERMISSIONS,
  PERMISSION_LABELS,
  hasPermission,
  getPermissionsForMember,
  type Permission,
} from '@/lib/permissions'
import type { TenantAppRole } from '@/lib/tenant-membership'

export {
  ALL_PERMISSIONS,
  DEFAULT_PRO_PERMISSIONS,
  PERMISSION_LABELS,
  hasPermission,
  getPermissionsForMember,
  type Permission,
}

export type PermissionSet = Permission[]

export function can(permissions: PermissionSet, permission: Permission): boolean {
  return hasPermission(permissions, permission)
}

export function canAny(permissions: PermissionSet, checks: Permission[]): boolean {
  return checks.some((p) => can(permissions, p))
}

/** Resolve effective permissions for a tenant member. */
export function resolveMemberPermissions(
  role: TenantAppRole,
  customRolePermissions?: Permission[] | null,
): PermissionSet {
  return getPermissionsForMember(role, customRolePermissions)
}

/** Validate stored JSON permissions against the catalog. */
export function sanitizePermissions(raw: unknown): PermissionSet {
  if (!Array.isArray(raw)) return []
  const allowed = new Set<string>(ALL_PERMISSIONS)
  return raw.filter((p): p is Permission => typeof p === 'string' && allowed.has(p))
}

/** Pages/features that require ADMIN role (not grantable via custom roles). */
export const ADMIN_ONLY_PATHS = [
  '/admin/overview',
  '/admin/permissions',
  '/admin/settings',
  '/admin/setup',
  '/admin/requests',
] as const

/** Permission required to access a pro or admin feature route (href suffix after tenant base). */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/admin/leads': 'leads.view',
  '/admin/my-leads': 'leads.view',
  '/admin/kanban': 'kanban.view',
  '/admin/import': 'import.leads',
  '/admin/templates': 'templates.manage',
  '/admin/analytics': 'analytics.view',
  '/admin/team': 'teams.manage',
  '/admin/users': 'teams.manage',
  '/pro/leads': 'leads.view',
  '/pro/kanban': 'kanban.view',
  '/pro/reassigned-leads': 'leads.receive',
  '/pro/analytics': 'analytics.view',
  '/pro/import': 'import.leads',
  '/pro/templates': 'templates.manage',
  '/pro/team': 'teams.manage',
}

export function permissionForRoute(routeSuffix: string): Permission | null {
  return ROUTE_PERMISSIONS[routeSuffix] ?? null
}

export function filterNavByPermissions<
  T extends { href: string; permission?: Permission },
>(items: T[], permissions: PermissionSet): T[] {
  return items.filter((item) => {
    if (!item.permission) return true
    return can(permissions, item.permission)
  })
}

export function defaultRedirectForRole(
  tenantSlug: string,
  role: TenantAppRole,
): string {
  return role === 'ADMIN'
    ? `/t/${tenantSlug}/admin/overview`
    : `/t/${tenantSlug}/pro/overview`
}

export function forbiddenRedirect(
  tenantSlug: string,
  role: TenantAppRole,
): string {
  return defaultRedirectForRole(tenantSlug, role)
}
