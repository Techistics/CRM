import { cn } from '@/lib/utils'

export function DashboardSkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-consulty-lg bg-consulty-border-subtle dark:bg-consulty-border',
        className,
      )}
    />
  )
}

export function ConsultyDashboardSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-3.5 lg:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <DashboardSkeletonBlock className="h-5 w-24" />
          <DashboardSkeletonBlock className="h-3 w-56" />
        </div>
        <div className="flex gap-2">
          <DashboardSkeletonBlock className="h-8 w-28 rounded-consulty-sm" />
          <DashboardSkeletonBlock className="h-8 w-48 rounded-consulty-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardSkeletonBlock key={i} className="h-28" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DashboardSkeletonBlock className="h-72" />
        <DashboardSkeletonBlock className="h-72" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <DashboardSkeletonBlock className="h-80 lg:col-span-3" />
        <DashboardSkeletonBlock className="h-80 lg:col-span-1" />
      </div>
    </div>
  )
}
