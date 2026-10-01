'use client'

import { useSidebar } from '@/components/sidebar-provider'
import { cn } from '@/lib/utils'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar()

  return (
    <div
      className={cn(
        "flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-in-out",
        isOpen ? "lg:pl-[var(--sidebar-width)]" : "lg:pl-0"
      )}
    >
      {children}
    </div>
  )
}
