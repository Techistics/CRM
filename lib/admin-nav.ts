/**
 * Central route definitions for the admin app shell.
 * UI labels and icons live in `components/admin/nav-config.tsx`.
 */
export const ADMIN_ROUTES = {
  overview: '/admin/overview',
  team: '/admin/team',
  leads: '/admin/leads',
  kanban: '/admin/kanban',
  templates: '/admin/templates',
  requests: '/admin/requests',
  import: '/admin/import',
  settings: '/admin/settings/general',
  pipeline: '/admin/settings/pipeline',
  analytics: '/admin/analytics',
  myLeads: '/admin/my-leads',
  permissions: '/admin/permissions', 
} as const
