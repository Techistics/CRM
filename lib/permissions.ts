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
  'finance.view',
  'finance.manage_commissions',
  'reports.view_all',
  'pipelines.manage',
  'teams.manage_access',
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
  'finance.view': 'View Finance',
  'finance.manage_commissions': 'Manage Commissions',
  'reports.view_all': 'View All Reports',
  'pipelines.manage': 'Manage Pipelines',
  'teams.manage_access': 'Manage Access (Roles & Passwords)',
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
  // ADMIN always gets everything
  if (role === 'ADMIN') return [...ALL_PERMISSIONS]
  // PRO with a custom role: get EXACTLY what the custom role defines, nothing more
  if (customRolePermissions != null && customRolePermissions.length > 0) {
    return [...customRolePermissions]
  }
  // PRO without a custom role: bare minimum defaults
  return DEFAULT_PRO_PERMISSIONS
}