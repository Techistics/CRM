import { Coins, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SnapshotItem } from '@/types/dashboard'
import { SNAPSHOT_ACCENT_STYLES as ACCENT } from '@/constants/dashboard'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'

type TeamSnapshotProps = {
  counselorCount: number
  pipelineValue: number
  conversionRate: number
  className?: string
}

function SnapshotMiniCard({ item }: { item: SnapshotItem }) {
  const Icon = item.icon
  const accent = ACCENT[item.accent]

  return (
    <div className="rounded-consulty-md border border-consulty-border-subtle bg-consulty-surface-subtle p-2.5 dark:border-consulty-border dark:bg-consulty-surface-subtle/50">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-consulty-md',
            accent.iconBg,
          )}
        >
          <Icon className={cn('h-4 w-4', accent.iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-crm-xs font-medium text-consulty-text-muted">{item.label}</p>
          <p className="mt-0.5 text-crm-lg font-bold tabular-nums text-consulty-text-primary">
            {item.value}
          </p>
          <p className="mt-0.5 text-crm-xs text-consulty-text-secondary">{item.description}</p>
        </div>
      </div>
    </div>
  )
}

export function TeamSnapshot({
  counselorCount,
  pipelineValue,
  conversionRate,
  className,
}: TeamSnapshotProps) {
  const items: SnapshotItem[] = [
    {
      label: 'Counselors',
      value: counselorCount.toLocaleString(),
      description: 'Active team members',
      icon: Users,
      accent: 'primary',
    },
    {
      label: 'Pipeline Value',
      value: `$${pipelineValue.toLocaleString()}`,
      description: 'Total pipeline value',
      icon: Coins,
      accent: 'secondary',
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      description: 'Average conversion',
      icon: TrendingUp,
      accent: 'success',
    },
  ]

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader title="Team Snapshot" />
      <DashboardCardBody className="space-y-2">
        {items.map((item) => (
          <SnapshotMiniCard key={item.label} item={item} />
        ))}
      </DashboardCardBody>
    </DashboardCard>
  )
}
