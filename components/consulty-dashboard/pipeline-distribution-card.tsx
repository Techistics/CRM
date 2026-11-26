'use client'

import { PipelineDistributionDonut } from '@/components/PipelineDistributionDonut'
import type { PipelineGroupBreakdown } from '@/components/PipelineDistributionDonut'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'

export function PipelineDistributionCard({
  groups,
  totalLeads: totalLeadsProp,
  className,
  title = "Pipeline Distribution",
  description = "Leads in selected period",
  compact = false,
}: {
  groups: PipelineGroupBreakdown[]
  totalLeads?: number
  className?: string
  title?: string
  description?: string
  compact?: boolean
}) {
  const totalLeads = totalLeadsProp ?? groups.reduce((sum, group) => sum + group.count, 0)

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader
        title={title}
        description={description}
        badge={
          <span className="rounded-full bg-consulty-primary-soft px-2 py-0.5 text-crm-xs font-semibold uppercase tracking-wide text-consulty-primary dark:bg-consulty-primary-soft/30">
            {totalLeads.toLocaleString()} Total Leads
          </span>
        }
      />
      <DashboardCardBody>
        <PipelineDistributionDonut
          groups={groups}
          centerValue={totalLeads.toLocaleString()}
          compact={compact}
        />
      </DashboardCardBody>
    </DashboardCard>
  )
}
