'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut, PanelLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

import type { AppRole } from '@/types/roles'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { tenantPath } from '@/lib/tenant-path'
import { Button } from '@/components/ui/button'
import { crmConfig } from '@/lib/config/theme'
import { adminSettingsLinks } from '@/components/admin/nav-config'
import { filterNavByPermissions, type Permission } from '@/lib/authz'
import type { Tenant } from '@/types/models'
import {
  LayoutDashboard, Users, Wallet, LineChart, Import,
  UserCheck, Sparkles, BookOpen, KeyRound, Settings as SettingsIcon,
  Layers, DollarSign,
} from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/admin-nav'
import { PRO_ROUTES } from '@/lib/pro-nav'

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href
}

export function RoleSidebar({
  role,
  tenant,
  permissions = [],
  badges,
}: {
  role: AppRole
  tenant: Tenant
  permissions?: Permission[]
  badges?: Partial<Record<string, string>>
}) {
  const tenantSlug = tenant.slug
  const tenantSettings = (tenant.settings as Record<string, string | null>) || {}
  const logoSrc = tenantSettings.logoUrl || crmConfig.brand.logo
  const brandName = tenant.name || crmConfig.brand.name
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()
  const sidebarScale = pathname?.includes('/kanban') ? 0.78 : 0.67

  const isAdmin = role === 'ADMIN'

  type NavItem = {
    name: string
    href: string
    icon: React.ElementType
    permission?: Permission
    matchPrefix?: boolean
    badgeKey?: string
  }

  // Admin nav (only used when role === 'ADMIN')
  const adminNav: NavItem[] = [
    { name: 'Dashboard',         href: ADMIN_ROUTES.overview,   icon: LayoutDashboard, permission: 'analytics.view', matchPrefix: false },
    { name: 'Leads',             href: ADMIN_ROUTES.leads,      icon: Wallet,          permission: 'leads.view',      matchPrefix: true },
    { name: 'My Leads',          href: ADMIN_ROUTES.myLeads,    icon: UserCheck,       permission: 'leads.receive',   matchPrefix: true },
    { name: 'Import Leads',      href: ADMIN_ROUTES.import,     icon: Import,          permission: 'import.leads',    matchPrefix: true },
    { name: 'Analytics',         href: ADMIN_ROUTES.analytics,  icon: LineChart,       permission: 'analytics.view',  matchPrefix: true },
    { name: 'Finance',           href: ADMIN_ROUTES.finance,    icon: DollarSign,      permission: 'finance.view',    matchPrefix: true },
    { name: 'Templates',         href: ADMIN_ROUTES.templates,  icon: Sparkles,        permission: 'templates.manage',matchPrefix: true },
    { name: 'Team',              href: ADMIN_ROUTES.team,       icon: Users,           permission: 'teams.manage',    matchPrefix: true, badgeKey: 'team' },
    { name: 'Counselor Diaries', href: ADMIN_ROUTES.diary,      icon: BookOpen,        permission: 'analytics.view',  matchPrefix: true },
  ]

  // PRO nav (only used when role === 'PRO')
  const proNav: NavItem[] = [
    { name: 'Dashboard',         href: PRO_ROUTES.overview,          icon: LayoutDashboard, permission: 'analytics.view', matchPrefix: false },
    { name: 'Leads',             href: PRO_ROUTES.leads,             icon: Wallet,          permission: 'leads.view',      matchPrefix: true },
    { name: 'Reassigned Leads',  href: PRO_ROUTES.reassignedLeads,   icon: UserCheck,       permission: 'leads.receive',   matchPrefix: true },
    { name: 'Import Leads',      href: PRO_ROUTES.import,            icon: Import,          permission: 'import.leads',    matchPrefix: true },
    { name: 'Analytics',         href: PRO_ROUTES.analytics,         icon: LineChart,       permission: 'analytics.view',  matchPrefix: true },
    { name: 'Finance',           href: PRO_ROUTES.finance,           icon: DollarSign,      permission: 'finance.view',    matchPrefix: true },
    { name: 'Templates',         href: PRO_ROUTES.templates,         icon: Sparkles,        permission: 'templates.manage', matchPrefix: true },
    { name: 'Team',              href: PRO_ROUTES.team,              icon: Users,           permission: 'teams.manage',    matchPrefix: true, badgeKey: 'team' },
    { name: 'Diary',             href: PRO_ROUTES.diary,             icon: BookOpen,        matchPrefix: true },
  ]

  // Settings links gated on teams.manage
  const adminSettings: NavItem[] = [
    { name: 'Settings',     href: ADMIN_ROUTES.settings,     icon: SettingsIcon, permission: 'teams.manage' },
    { name: 'Pipeline',     href: ADMIN_ROUTES.pipeline,     icon: Layers,       permission: 'teams.manage' },
    { name: 'Permissions',  href: ADMIN_ROUTES.permissions,  icon: KeyRound,     permission: 'teams.manage' },
  ]
  const proSettings: NavItem[] = [
    { name: 'Settings',     href: PRO_ROUTES.settings,       icon: SettingsIcon },
    { name: 'Pipeline',     href: '/pro/settings/pipeline',  icon: Layers,       permission: 'pipelines.manage' },
  ]

  const allNav = isAdmin ? adminNav : proNav
  const allSettings = isAdmin ? adminSettings : proSettings
  const mainNav = isAdmin ? allNav : filterNavByPermissions(allNav, permissions)
  const settingsLinks = isAdmin ? allSettings : filterNavByPermissions(allSettings, permissions)

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 lg:hidden',
          isOpen ? 'block' : 'hidden',
        )}
        onClick={toggle}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col',
          'border-r border-slate-200 bg-white dark:bg-[#0b0f19] dark:border-slate-800',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        data-role={role}
        style={{ overflow: 'hidden' }}
      >
        <div
          style={{
          transform: `scale(${sidebarScale})`,
          transformOrigin: 'top left',
          width: `${(1 / sidebarScale) * 100}%`,
          height: `${(1 / sidebarScale) * 100}vh`,
          display: 'flex',
          flexDirection: 'column',
        }}
        >
          <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4">
            <Image src={logoSrc} alt={brandName} width={26} height={26} className="rounded-lg object-contain" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{brandName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={toggle}
              type="button"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Main
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              {mainNav.map((item) => {
                const href = tenantPath(tenantSlug, item.href)
                const active = isActive(pathname, href, item.matchPrefix)
                const badge = item.badgeKey && badges ? badges[item.badgeKey] : undefined
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'font-semibold text-brand bg-brand-light dark:bg-brand/10'
                        : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                    )}
                  >
                    <item.icon className={cn('h-[16px] w-[16px] shrink-0', active ? 'text-brand' : 'text-slate-400')} />
                    <span className={cn('font-medium')}>{item.name}</span>
                    {badge ? (
                      <span className="ml-auto flex min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-3">
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Settings
              </p>
              {settingsLinks.length ? (
                <nav className="space-y-0.5">
                  {settingsLinks.map((item) => {
                    const href = tenantPath(tenantSlug, item.href)
                    const active = pathname === href.split('#')[0]
                    return (
                      <Link
                        key={item.name}
                        href={href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'font-semibold text-brand bg-brand-light dark:bg-brand/10'
                            : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                        )}
                      >
                        <item.icon className={cn('h-[16px] w-[16px] shrink-0', active ? 'text-brand' : 'text-slate-400')} />
                        <span className="block min-w-0">
                          <span className={cn('block leading-none font-medium')}>{item.name}</span>
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              ) : (
                <div className="px-2 py-[7px] text-[11px] font-medium text-[var(--muted-text)]">—</div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-3">
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/sign-in')
                  router.refresh()
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-[16px] w-[16px] shrink-0" />
                <span className="min-w-0">
                  <span className="block leading-none">Logout</span>
                  <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">Exit the app</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
