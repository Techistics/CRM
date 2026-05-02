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
          'fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden',
          isOpen ? 'block' : 'hidden',
        )}
        onClick={toggle}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col',
          'border-r-[0.5px] border-r-[var(--card-border-color)] bg-[var(--sidebar-bg)]',
          'transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        data-role={role}
      >
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center gap-2 px-3">
          <Image src={logoSrc} alt={brandName} width={26} height={26} className="rounded-sm object-contain" />
          <span className="text-[14px] font-semibold text-[var(--text-strong)] truncate">{brandName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 rounded-[8px] p-0 lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-text)]">
            Main
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
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
                    'flex items-center gap-3 rounded-[8px] px-3 py-[8px] text-[13px] transition-all',
                    active
                      ? 'bg-[var(--accent-color)]/15 text-[var(--accent-text)]'
                      : 'text-[var(--text-main)] hover:bg-[var(--foreground)]/5 hover:text-[var(--text-strong)]',
                  )}
                >
                  <item.icon
                    className={cn('h-[16px] w-[16px] shrink-0', active ? 'opacity-100' : 'opacity-60')}
                  />
                  <span className={cn('font-medium')}>{item.name}</span>
                  {badge ? (
                    <span className="ml-auto flex min-w-[22px] items-center justify-center rounded-[999px] bg-[var(--danger)] px-[6px] py-[1px] text-[10px] font-bold text-white shadow-sm">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <div className="border-t-[0.5px] border-t-[var(--card-border-color)] px-2 py-3">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-text)]">
              Settings
            </p>
            {settingsLinks.length ? (
              <nav className="space-y-1">
                {settingsLinks.map((item) => {
                  const href = tenantPath(tenantSlug, item.href)
                  const active = pathname === href.split('#')[0]
                  return (
                    <Link
                      key={item.name}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-[8px] px-3 py-[8px] text-[13px] transition-all',
                        active
                          ? 'bg-[var(--accent-color)]/15 text-[var(--accent-text)]'
                          : 'text-[var(--text-main)] hover:bg-[var(--foreground)]/5 hover:text-[var(--text-strong)]',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-[16px] w-[16px] shrink-0',
                          active ? 'opacity-100' : 'opacity-60',
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

          <div className="border-t-[0.5px] border-t-[var(--card-border-color)] px-2 py-3">
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                router.push('/sign-in')
                router.refresh()
              }}
              className="flex w-full items-center gap-3 rounded-[8px] px-3 py-[8px] text-left text-[13px] font-medium text-[var(--muted-text)] transition-all hover:bg-[var(--foreground)]/5 hover:text-[var(--text-strong)]"
            >
              <LogOut className="h-[16px] w-[16px] shrink-0 opacity-60" />
              <span className="min-w-0">
                <span className="block leading-none">Logout</span>
                <span className="mt-1 block text-[11px] font-medium text-[var(--muted-text)]">
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

