'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, LayoutDashboard } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'


import { UserMenu } from '@/components/shared/UserMenu'

export function AdminHeader({ 
  user,
  tenantSlug,
}: { 
  user: { name: string, email: string }
  tenantSlug: string
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
    <header className="sticky top-0 z-40 h-14 border-b border-consulty-border-subtle bg-consulty-surface dark:border-consulty-border dark:bg-consulty-surface">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="flex h-9 w-9 items-center justify-center rounded-consulty-md text-consulty-text-muted transition-colors hover:bg-consulty-surface-subtle dark:hover:bg-consulty-surface-raised lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-consulty-sm bg-consulty-primary">
              <LayoutDashboard className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-crm-md font-bold text-consulty-text-primary">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="hidden h-4 w-px bg-consulty-border-subtle dark:bg-consulty-border sm:block" />
            <ThemeToggle />
            <NotificationBell tenantSlug={tenantSlug} portalBase="admin" />
            <UserMenu user={user} role="ADMIN" tenantSlug={tenantSlug} />
          </div>
        </div>
      </div>
    </header>
  )
}
