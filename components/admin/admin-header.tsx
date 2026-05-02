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
    <header className="sticky top-0 z-40 h-[var(--topbar-height)] border-b-[0.5px] border-b-[var(--card-border-color)] bg-[var(--sidebar-bg)]/80 backdrop-blur-md transition-all">
      <div className="flex h-full items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold tracking-tight text-[var(--text-strong)]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="relative hidden w-full max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <input
              type="search"
              placeholder="Search leads, users, or settings..."
              className="h-9 w-full rounded-full border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] pl-10 pr-4 text-[13px] font-medium text-[var(--text-strong)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-color)]/50 placeholder:text-[var(--muted-text)]"
              aria-label="Search"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-4 w-[1px] bg-[var(--card-border-color)]" />
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-[var(--card-border-color)] bg-transparent hover:bg-[var(--foreground)]/5 transition-all"
            >
              <Bell className="h-[16px] w-[16px] text-[var(--muted-text)]" />
            </button>
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  )
}
