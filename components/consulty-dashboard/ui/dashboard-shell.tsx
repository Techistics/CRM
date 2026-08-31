import { cn } from '@/lib/utils'

type DashboardShellProps = {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn('w-full min-w-0 bg-consulty-canvas dark:bg-consulty-canvas', className)}>
      <div className="mx-auto w-full max-w-screen-2xl space-y-3 sm:space-y-3.5 lg:space-y-4">
        {children}
      </div>
    </div>
  )
}
