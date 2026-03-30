'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { LogOut, Menu } from 'lucide-react'

import type { AppRole } from '@/types/roles'
import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  adminMainNav,
  adminSettingsLinks,
} from '@/components/admin/nav-config'
import { proMainNav, proSettingsLinks } from '@/components/pro/nav-config'

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href
}

export function RoleSidebar({
  role,
  badges,
}: {
  role: AppRole
  badges?: Partial<Record<string, string>>
}) {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  const { mainNav, settingsLinks } = (() => {
    if (role === 'admin') {
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
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden',
          isOpen ? 'block' : 'hidden',
        )}
        onClick={toggle}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r bg-background',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        data-role={role}
      >
        {/* Brand header (centered like admin) */}
        <div className="flex h-14 shrink-0 items-center justify-center border-b px-4">
          <span className="text-base font-semibold tracking-tight">Edu CRM</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Main nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href, item.matchPrefix)
              const badge =
                item.badgeKey && badges ? badges[item.badgeKey] : undefined

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                  {badge ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.625rem] font-medium text-primary-foreground">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {/* Settings section (kept for consistent shell) */}
          <div className="border-t px-2 py-3">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
            {settingsLinks.length ? (
              <nav className="space-y-0.5">
                {settingsLinks.map((item) => {
                  const active = pathname === item.href.split('#')[0]
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-medium leading-none">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </nav>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                —
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="border-t px-2 py-3">
            <SignOutButton signOutOptions={{ redirectUrl: '/sign-in' }}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-muted-foreground text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-medium leading-none">Logout</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Exit the app
                  </span>
                </span>
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>
    </>
  )
}

