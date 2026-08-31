import { cn } from '@/lib/utils'

type DashboardCardProps = {
  children: React.ReactNode
  className?: string
}

export function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-consulty-lg border border-consulty-border-subtle bg-consulty-surface shadow-consulty-sm',
        'dark:border-consulty-border dark:bg-consulty-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

type DashboardCardHeaderProps = {
  title: string
  description?: string
  badge?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function DashboardCardHeader({
  title,
  description,
  badge,
  action,
  className,
}: DashboardCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-consulty-border-subtle px-3 py-3 sm:px-4 dark:border-consulty-border',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-crm-sm font-semibold text-consulty-text-primary">{title}</h2>
          {badge}
        </div>
        {description ? (
          <p className="mt-0.5 text-crm-xs text-consulty-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  )
}

export function DashboardCardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('p-3 sm:p-4', className)}>{children}</div>
}
