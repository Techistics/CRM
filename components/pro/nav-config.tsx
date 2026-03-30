import { LayoutDashboard, Users, BarChart3 } from 'lucide-react'

import { PRO_ROUTES } from '@/lib/pro-nav'
import type { SidebarNavLink, SidebarSettingsLink } from '@/types/navigation'

export const proMainNav: SidebarNavLink[] = [
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
  },
  {
    name: 'Kanban',
    href: PRO_ROUTES.kanban,
    icon: BarChart3,
    matchPrefix: true,
  },
]

export const proSettingsLinks: SidebarSettingsLink[] = []

