'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  adminMainNav,
  adminSettingsLinks,
} from '@/components/admin/nav-config'

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (matchPrefix) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return pathname === href
}

export function AdminSidebar({ teamBadge }: { teamBadge: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
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
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-slate-200 bg-white dark:bg-[#0b0f19] dark:border-slate-800',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand header */}
        <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Edu CRM</span>
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
          {/* Main nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {adminMainNav.map((item) => {
              const active = isActive(pathname, item.href, item.matchPrefix)
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
                  <span>{item.name}</span>
                  {item.name === 'Users' && teamBadge ? (
                    <span className="ml-auto flex min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {teamBadge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {/* Settings section */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-3">
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Settings
            </p>
            <nav className="space-y-0.5">
              {adminSettingsLinks.map((item) => {
                const active = pathname === item.href.split('#')[0]
                return (
                  <Link
                    key={item.name}
                    href={item.href}
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
                    <span className="min-w-0">
                      <span className="block font-medium leading-none">{item.name}</span>
                    </span>
                  </Link>
                )
              })}
            </nav>
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
