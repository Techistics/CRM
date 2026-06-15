'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  CreditCard,
  Grid3X3,
  List,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

import { crmConfig } from '@/lib/config/theme'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { TopNavSearch } from './TopNavSearch'

type AdminShellProps = {
  children: React.ReactNode
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  matchPrefix?: boolean
}

const platformNav: NavItem[] = [
  { label: 'Workspaces', href: '/platform/tenants', icon: Grid3X3, matchPrefix: true },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Settings', href: '/platform/settings', icon: Settings },
]

const systemNav: NavItem[] = [
  { label: 'Audit logs', href: '/platform/audit-logs', icon: List },
  { label: 'Billing', href: '/platform/billing', icon: CreditCard },
]

function initialsFromName(name: string) {
  const chunks = name.trim().split(/\s+/).filter(Boolean)
  if (chunks.length === 0) return 'AD'
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase()
}

function isActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }
  return pathname === item.href
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const breadcrumb = useMemo(() => {
    if (pathname.startsWith('/platform/tenants/new')) return 'Platform / New workspace'
    if (pathname.startsWith('/platform/tenants')) return 'Platform / Workspaces'
    if (pathname.startsWith('/platform/users')) return 'Platform / Users'
    if (pathname.startsWith('/platform/settings')) return 'Platform / Settings'
    if (pathname.startsWith('/platform/audit-logs')) return 'Platform / Audit logs'
    if (pathname.startsWith('/platform/billing')) return 'Platform / Billing'
    return 'Platform / Dashboard'
  }, [pathname])

  const adminName = 'Platform Admin'
  const adminInitials = initialsFromName(adminName)

  const sidebarNav = (
    <>
          <nav className="flex-1 space-y-6 p-3">
            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted-text)]">Platform</p>
              {platformNav.map((item) => {
                const active = isActive(pathname, item)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 rounded-[8px] px-[10px] py-[8px] text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-[var(--accent-color)]/15 text-[var(--accent-text)]'
                        : 'text-[var(--text-main)] hover:bg-[var(--foreground)]/5 hover:text-[var(--text-strong)]'
                    }`}
                  >
                    <item.icon className={`h-[16px] w-[16px] ${active ? 'opacity-100' : 'opacity-60'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted-text)]">System</p>
              {systemNav.map((item) => {
                const active = isActive(pathname, item)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 rounded-[8px] px-[10px] py-[8px] text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-[var(--accent-color)]/15 text-[var(--accent-text)]'
                        : 'text-[var(--text-main)] hover:bg-[var(--foreground)]/5 hover:text-[var(--text-strong)]'
                    }`}
                  >
                    <item.icon className={`h-[16px] w-[16px] ${active ? 'opacity-100' : 'opacity-60'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="mt-auto border-t-[0.5px] border-t-[var(--card-border-color)] px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color)] text-[12px] font-bold text-[var(--accent-text)] shadow-sm">
                {adminInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text-strong)]">{adminName}</p>
                <p className="text-[11px] font-medium text-[var(--muted-text)]">Super Admin</p>
              </div>
            </div>
          </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--main-bg)] text-[var(--text-main)]">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden',
          mobileNavOpen ? 'block' : 'hidden',
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden
      />
      <div className="flex min-h-screen min-w-0">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r-[0.5px] border-r-[var(--card-border-color)] bg-[var(--sidebar-bg)] transition-transform duration-200 lg:static lg:translate-x-0',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="flex h-[var(--topbar-height)] items-center gap-2.5 border-b-[0.5px] border-b-[var(--card-border-color)] px-4">
            <Image src={crmConfig.brand.logo} alt={crmConfig.brand.name} width={26} height={26} />
            <span className="text-[14px] font-semibold text-[var(--text-strong)]">{crmConfig.brand.name}</span>
            <span className="rounded-[4px] bg-[var(--accent-color)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
              ADMIN
            </span>
          </div>

          {sidebarNav}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--main-bg)] lg:pl-0">
          <header className="flex h-[var(--topbar-height)] min-w-0 items-center justify-between gap-2 border-b-[0.5px] border-b-[var(--card-border-color)] bg-[var(--sidebar-bg)] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                type="button"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
              <p className="truncate text-[13px] font-medium text-[var(--muted-text)]">{breadcrumb}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <div className="hidden sm:block">
                <TopNavSearch />
              </div>
              <Link
                href="/platform/tenants/new"
                className="rounded-[8px] bg-[var(--accent-color)] px-3 py-2 text-xs font-semibold text-[var(--accent-text)] shadow-sm transition-all hover:brightness-95 active:scale-95 sm:px-4 sm:text-[13px]"
              >
                <span className="hidden sm:inline">New workspace</span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
          </header>
          <main className="crm-page w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
