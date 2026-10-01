'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { PanelLeft } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'


import { UserMenu } from '@/components/shared/UserMenu'

export function AdminHeader({ 
  user,
  tenantSlug,
  role,
  customRoleName,
}: { 
  user: { name: string, email: string }
  tenantSlug: string
  role?: string
  customRoleName?: string | null
}) {
  const { toggle, isOpen } = useSidebar()
  const pathname = usePathname()


  return (
    <header className="sticky top-0 z-40 h-14 border-b border-consulty-border-subtle bg-consulty-surface dark:border-consulty-border dark:bg-consulty-surface">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!isOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="flex h-9 w-9 items-center justify-center rounded-consulty-md text-consulty-text-muted transition-colors hover:bg-consulty-surface-subtle dark:hover:bg-consulty-surface-raised"
              onClick={toggle}
              title="Toggle Sidebar"
              type="button"
            >
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}


        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="hidden h-4 w-px bg-consulty-border-subtle dark:bg-consulty-border sm:block" />
            <ThemeToggle />
            <NotificationBell tenantSlug={tenantSlug} portalBase="admin" />
            <UserMenu user={user} role={role === 'ADMIN' ? 'ADMIN' : (customRoleName ?? 'PRO')} tenantSlug={tenantSlug} />
          </div>
        </div>
      </div>
    </header>
  )
}
