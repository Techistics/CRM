import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  LineChart,
  KeyRound,
  Import,
  UserCheck,
  Sparkles,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react'

import { ADMIN_ROUTES } from '@/lib/admin-nav'
import type { Permission } from '@/lib/authz'

import type { AdminNavLink, AdminSettingsLink } from '@/types/navigation'

export type PermissionNavLink = AdminNavLink & { permission?: Permission }

export const adminMainNav: PermissionNavLink[] = [
  {
    name: 'Dashboard',
    href: ADMIN_ROUTES.overview,
    icon: LayoutDashboard,
  },
  {
    name: 'Templates',
    href: ADMIN_ROUTES.templates,
    icon: Sparkles,
    matchPrefix: true,
    permission: 'templates.manage',
  },
  {
    name: 'Users',
    href: ADMIN_ROUTES.team,
    icon: Users,
    matchPrefix: true,
    permission: 'teams.manage',
  },
  {
    name: 'Import Leads',
    href: ADMIN_ROUTES.import,
    icon: Import,
    matchPrefix: true,
    permission: 'import.leads',
  },
  {
    name: 'Leads',
    href: ADMIN_ROUTES.leads,
    icon: Wallet,
    matchPrefix: true,
    permission: 'leads.view',
  },
  {
    name: 'My Leads',
    href: ADMIN_ROUTES.myLeads,
    icon: UserCheck,
    matchPrefix: true,
    permission: 'leads.view',
  },
  {
    name: 'Kanban',
    href: ADMIN_ROUTES.kanban,
    icon: BarChart3,
    matchPrefix: true,
    permission: 'kanban.view',
  },
  {
    name: 'Analytics',
    href: ADMIN_ROUTES.analytics,
    icon: LineChart,
    matchPrefix: true,
    permission: 'analytics.view',
  },
]

export const adminSettingsLinks: AdminSettingsLink[] = [
  {
    name: 'Settings',
    href: ADMIN_ROUTES.settings,
    icon: SettingsIcon,
  },
  {
    name: 'Pipeline',
    href: ADMIN_ROUTES.pipeline,
    icon: Layers,
  },
  {
    name: 'Permissions',
    href: ADMIN_ROUTES.permissions,
    icon: KeyRound,
  },
]
