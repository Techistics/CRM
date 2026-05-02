import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  KeyRound,
  Import,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react'

import { ADMIN_ROUTES } from '@/lib/admin-nav'

import type { AdminNavLink, AdminSettingsLink } from '@/types/navigation'

export const adminMainNav: AdminNavLink[] = [
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
  },
  {
    name: 'Users',
    href: ADMIN_ROUTES.team,
    icon: Users,
    matchPrefix: true,
  },
  {
    name: 'Import Leads',
    href: ADMIN_ROUTES.import,
    icon: Import,
    matchPrefix: true,
  },
  {
    name: 'Leads',
    href: ADMIN_ROUTES.leads,
    icon: Wallet,
    matchPrefix: true,
  },
  {
    name: 'Kanban',
    href: ADMIN_ROUTES.kanban,
    icon: BarChart3,
    matchPrefix: true,
  },
]

export const adminSettingsLinks: AdminSettingsLink[] = [
  {
    name: 'Settings',
    href: ADMIN_ROUTES.settings,
    icon: SettingsIcon,
  },
  {
    name: 'Permissions',
    href: ADMIN_ROUTES.requests,
    icon: KeyRound,
  },
]

