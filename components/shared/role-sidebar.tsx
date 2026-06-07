'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'

import type { AppRole } from '@/types/roles'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { tenantPath } from '@/lib/tenant-path'
import { Button } from '@/components/ui/button'
import { crmConfig } from '@/lib/config/theme'
import {
  adminMainNav,
  adminSettingsLinks,
} from '@/components/admin/nav-config'
import { proMainNav, proSettingsLinks } from '@/components/pro/nav-config'

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href
}

import type { Tenant } from '@/types/models'

export function RoleSidebar({
  role,
  tenant,
  badges,
}: {
  role: AppRole
  tenant: Tenant
  badges?: Partial<Record<string, string>>
}) {
  const tenantSlug = tenant.slug
  const tenantSettings = (tenant.settings as Record<string, string | null>) || {}
  const logoSrc = tenantSettings.logoUrl || crmConfig.brand.logo
  const brandName = tenant.name || crmConfig.brand.name
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  const { mainNav, settingsLinks } = (() => {
    const normalizedRole = role.toUpperCase()
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
      return {
        mainNav: adminMainNav.map((i) =>
          i.name === 'Users' ? { ...i, badgeKey: 'team' } : i,
        ),
        settingsLinks: adminSettingsLinks,
      }
    }
    return { mainNav: proMainNav, settingsLinks: proSettingsLinks }
  })()

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
          'transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        data-role={role}
      >
        <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4">
          <Image src={logoSrc} alt={brandName} width={26} height={26} className="rounded-lg object-contain" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{brandName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
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
              const badge =
                item.badgeKey && badges ? badges[item.badgeKey] : undefined

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
                  <item.icon
                    className={cn(
                      'h-[16px] w-[16px] shrink-0',
                      active ? 'text-brand' : 'text-slate-400',
                    )}
                  />
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
                      <item.icon
                        className={cn(
                          'h-[16px] w-[16px] shrink-0',
                          active ? 'text-brand' : 'text-slate-400',
                        )}
                      />
                      <span className="block min-w-0">
                        <span className={cn('block leading-none font-medium')}>
                          {item.name}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </nav>
            ) : (
              <div className="px-2 py-[7px] text-[11px] font-medium text-[var(--muted-text)]">
                —
              </div>
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
                <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                  Exit the app
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

