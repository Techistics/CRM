'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'

import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function AdminHeader({ tenantSlug }: { tenantSlug: string }) {
  void tenantSlug
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
    <header className="sticky top-0 z-30 h-[var(--topbar-height)] border-b-[0.5px] border-b-[var(--card-border-color)] bg-[var(--card-bg)]">
      <div className="flex h-[var(--topbar-height)] items-center gap-4 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-[8px] p-0 lg:hidden"
          onClick={toggle}
          type="button"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        <div className="w-[200px]">
          <h1 className="text-[17px] font-medium text-[var(--text-strong)]">{pageTitle}</h1>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative mx-auto w-[200px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--muted-text)]" />
            <input
              type="search"
              placeholder="Search..."
              aria-label="Search"
              className="h-8 w-[200px] rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] pl-7 pr-2 text-[12px] font-normal text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)]"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)]"
          >
            <Bell className="h-[15px] w-[15px] text-[var(--muted-text)]" />
          </button>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-[var(--accent-text)]">
            AD
          </div>
        </div>
      </div>
    </header>
  )
}
