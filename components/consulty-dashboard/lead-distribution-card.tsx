'use client'

import { useRouter } from 'next/navigation'
import { LeadDistributionDonut } from '@/components/LeadDistributionDonut'
import type { AgentBreakdown, StageBreakdown } from '@/components/LeadDistributionDonut'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'
import type { LeadDistributionCardProps } from '@/types/dashboard'

export function LeadDistributionCard({
  unassignedCount,
  breakdown,
  unassignedBreakdown,
  totalLeads,
  tenantSlug,
  className,
}: LeadDistributionCardProps) {
  const router = useRouter()
  const donutTotal = unassignedCount + breakdown.reduce((sum, agent) => sum + agent.totalLeads, 0)

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader
        title="Lead Distribution"
        description="All leads by counselor"
        badge={
          <span className="rounded-full bg-consulty-primary-soft px-2 py-0.5 text-crm-xs font-semibold uppercase tracking-wide text-consulty-primary dark:bg-consulty-primary-soft/30">
            {donutTotal.toLocaleString()} Total Leads
          </span>
        }
      />
      <DashboardCardBody>
        <LeadDistributionDonut
          unassignedCount={unassignedCount}
          breakdown={breakdown}
          unassignedBreakdown={unassignedBreakdown}
          onUnassignedClick={() =>
            router.push(`/t/${tenantSlug}/admin/leads?assignedTo=unassigned`)
          }
          centerValue={totalLeads.toLocaleString()}
        />
      </DashboardCardBody>
    </DashboardCard>
  )
}
