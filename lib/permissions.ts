export const ALL_PERMISSIONS = [
  'leads.view',
  'leads.create',
  'leads.edit',
  'leads.delete',
  'leads.assign',
  'leads.receive',
  'analytics.view',
  'import.leads',
  'templates.manage',
  'kanban.view',
  'teams.manage',
  'payments.view',
  'payments.edit',
] as const

export type Permission = typeof ALL_PERMISSIONS[number]

export const PERMISSION_LABELS: Record<Permission, string> = {
  'leads.view': 'View Leads',
  'leads.create': 'Create Leads',
  'leads.edit': 'Edit Leads',
  'leads.delete': 'Delete Leads',
  'leads.assign': 'Assign Leads',
  'analytics.view': 'View Analytics',
  'import.leads': 'Import Leads',
  'templates.manage': 'Manage Templates',
  'kanban.view': 'View Kanban',
  'teams.manage': 'Manage Team',
  'leads.receive': 'Receive Reassigned Leads',
  'payments.view': 'View Payments',
  'payments.edit': 'Edit Payments',
}

export const DEFAULT_PRO_PERMISSIONS: Permission[] = [
  'leads.view',
  'leads.create',
  'leads.edit',
  'kanban.view',
  'analytics.view',
]

export function hasPermission(permissions: Permission[], check: Permission): boolean {
  return permissions.includes(check)
}

export function getPermissionsForMember(
  role: 'ADMIN' | 'PRO',
  customRolePermissions?: Permission[] | null,
): Permission[] {
  if (role === 'ADMIN') return [...ALL_PERMISSIONS]
  if (customRolePermissions != null) {
    return Array.from(new Set([...DEFAULT_PRO_PERMISSIONS, ...customRolePermissions]))
  }
  return DEFAULT_PRO_PERMISSIONS
}