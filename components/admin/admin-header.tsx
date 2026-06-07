'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'

import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'

import { UserMenu } from '@/components/shared/UserMenu'

export function AdminHeader({ 
  user 
}: { 
  user: { name: string, email: string } 
}) {
  const { toggle } = useSidebar()
  const pathname = usePathname()

  const pageTitle = useMemo(() => {
    if (pathname.includes('/admin/overview')) return 'Dashboard'
    if (pathname.includes('/admin/leads')) return 'Leads'
    if (pathname.includes('/admin/import')) return 'Import Leads'
    if (pathname.includes('/admin/team')) return 'Users'
    if (pathname.includes('/admin/kanban')) return 'Kanban'
    if (pathname.includes('/admin/requests')) return 'Permissions'
    return 'Dashboard'
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 h-[60px] bg-white dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800">
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search leads, users, or settings..."
              className="h-9 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              aria-label="Search"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notifications"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  )
}
