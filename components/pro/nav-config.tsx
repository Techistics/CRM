import { LayoutDashboard, Users, BarChart3, Settings, ArrowLeftRight, Import, Sparkles, BookOpen } from 'lucide-react'

import { PRO_ROUTES } from '@/lib/pro-nav'
import type { Permission } from '@/lib/authz'
import type { SidebarNavLink, SidebarSettingsLink } from '@/types/navigation'

export type PermissionNavLink = SidebarNavLink & { permission?: Permission }

export const proMainNav: PermissionNavLink[] = [
  {
    name: 'Dashboard',
    href: PRO_ROUTES.overview,
    icon: LayoutDashboard,
    matchPrefix: true,
  },
  {
    name: 'Leads',
    href: PRO_ROUTES.leads,
    icon: Users,
    matchPrefix: true,
    permission: 'leads.view',
  },
  {
    name: 'Reassigned Leads',
    href: PRO_ROUTES.reassignedLeads,
    icon: ArrowLeftRight,
    matchPrefix: true,
    permission: 'leads.receive',
  },
  {
    name: 'Kanban',
    href: PRO_ROUTES.kanban,
    icon: BarChart3,
    matchPrefix: true,
    permission: 'kanban.view',
  },
  {
    name: 'Analytics',
    href: PRO_ROUTES.analytics,
    icon: BarChart3,
    matchPrefix: true,
    permission: 'analytics.view',
  },
  {
    name: 'Import Leads',
    href: PRO_ROUTES.import,
    icon: Import,
    matchPrefix: true,
    permission: 'import.leads',
  },
  {
    name: 'Templates',
    href: PRO_ROUTES.templates,
    icon: Sparkles,
    matchPrefix: true,
  },
  {
    name: 'Team',
    href: PRO_ROUTES.team,
    icon: Users,
    matchPrefix: true,
    permission: 'teams.manage',
  },
  {
    name: 'My Notes',
    href: PRO_ROUTES.diary,
    icon: BookOpen,
    matchPrefix: true,
  },
]

export const proSettingsLinks: SidebarSettingsLink[] = [
  {
    name: 'Settings',
    href: PRO_ROUTES.settings,
    icon: Settings,
  },
]
