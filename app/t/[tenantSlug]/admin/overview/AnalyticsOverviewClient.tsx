'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
import { Activity, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/consulty-dashboard/ui/dashboard-shell'
import { OverviewHeader } from '@/components/consulty-dashboard/overview-header'
import { MetricCardsGrid, type MetricCardData } from '@/components/consulty-dashboard/metric-card'
import { LeadDistributionCard } from '@/components/consulty-dashboard/lead-distribution-card'
import { TeamPerformanceTable } from '@/components/consulty-dashboard/team-performance-table'
import { TeamSnapshot } from '@/components/consulty-dashboard/team-snapshot'
import type { AgentStat, ChartWindow, PipelineChartSnapshot } from '@/types/analytics'

export default function AnalyticsOverviewClient({
  chartByWindow: _chartByWindow,
  overdueRemindersCount: _overdueRemindersCount,
  totalLeads,
  activeCount,
  paidCount,
  cancelledCount,
  newLeadsToday,
  unassignedCount,
  agentStats,
  pipelineValue,
  wonRevenue,
  inProgressCount,
  closedCount,
  conversionRate,
  teamPerformance,
  sparklines,
  trends,
  dateRange,
  agentStageBreakdown,
  unassignedBreakdown = [],
  filteredAgentStageBreakdown,
  filteredUnassignedBreakdown = [],
}: {
  chartByWindow: Record<ChartWindow, PipelineChartSnapshot>
  overdueRemindersCount: number
  totalLeads: number
  activeCount: number
  paidCount: number
  cancelledCount: number
  newLeadsToday: number
  unassignedCount: number
  agentStats: AgentStat[]
  pipelineValue: number
  wonRevenue: number
  inProgressCount: number
  closedCount: number
  conversionRate: number
  teamPerformance: Array<{
    id: string
    name: string
    email: string
    total_leads: number
    won: number
    conversion_rate: number | null
    last_activity: string | null
  }>
  sparklines?: {
    totalLeads: number[]
    newToday: number[]
    inProgress: number[]
    closed: number[]
  }
  trends?: {
    totalLeads: { value: string; positive: boolean }
    newToday: { value: string; positive: boolean }
    inProgress: { value: string; positive: boolean }
    closed: { value: string; positive: boolean }
  }
  dateRange: { from: Date | string | null; to: Date | string | null }
  agentStageBreakdown?: Array<{
    agentId: string | null
    agentName: string
    totalLeads: number
    stages: Array<{ key: string; label: string; count: number }>
  }>
  unassignedBreakdown?: Array<{ key: string; label: string; count: number }>
  filteredAgentStageBreakdown?: Array<{
    agentId: string | null
    agentName: string
    totalLeads: number
    stages: Array<{ key: string; label: string; count: number }>
  }>
  filteredUnassignedBreakdown?: Array<{ key: string; label: string; count: number }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')

  const safeDateRange = useMemo(
    () => ({
      from: dateRange.from ? new Date(dateRange.from) : null,
      to: dateRange.to ? new Date(dateRange.to) : null,
    }),
    [dateRange.from, dateRange.to],
  )

  const [exportingPipeline, setExportingPipeline] = useState(false)
  const [exportingAgent, setExportingAgent] = useState(false)

  const handleExport = async (type: 'pipeline' | 'agent') => {
    const setLoader = type === 'pipeline' ? setExportingPipeline : setExportingAgent
    setLoader(true)

    try {
      const q = new URLSearchParams()
      if (safeDateRange.from) q.set('from', safeDateRange.from.toISOString().split('T')[0])
      if (safeDateRange.to) q.set('to', safeDateRange.to.toISOString().split('T')[0])
      q.set('tenantSlug', tenantSlug)

      const url = `/api/reports/${type}-export?${q.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      const filename =
        res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `${type}-report.csv`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      toast.success(`${type === 'pipeline' ? 'Pipeline' : 'Counselor'} report downloaded`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
    } finally {
      setLoader(false)
    }
  }

  const handleRangeChange = (range: { from: Date | null; to: Date | null }) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (range.from) nextParams.set('from', range.from.toISOString().split('T')[0])
    else nextParams.delete('from')
    if (range.to) nextParams.set('to', range.to.toISOString().split('T')[0])
    else nextParams.delete('to')
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  const breakdown = agentStageBreakdown ?? []
  const donutUnassignedCount = (unassignedBreakdown ?? []).reduce((sum, b) => sum + b.count, 0)
  const donutTotalLeads = donutUnassignedCount + breakdown.reduce((sum, a) => sum + a.totalLeads, 0)
  const comparisonLabel = 'vs previous period'

  const filteredBreakdown = filteredAgentStageBreakdown ?? []
  const filteredDonutUnassignedCount = (filteredUnassignedBreakdown ?? []).reduce((sum, b) => sum + b.count, 0)
  const filteredDonutTotalLeads = filteredDonutUnassignedCount + filteredBreakdown.reduce((sum, a) => sum + a.totalLeads, 0)

  const metricCards: MetricCardData[] = [
    {
      label: 'Total Leads',
      value: totalLeads.toLocaleString(),
      trend: trends?.totalLeads.value ?? '+0%',
      positive: trends?.totalLeads.positive ?? true,
      comparison: comparisonLabel,
      icon: Users,
      accent: 'primary',
      sparkData: sparklines?.totalLeads ?? [3, 5, 4, 7, 6, 8, totalLeads],
      colorIndex: 0,
    },
    {
      label: 'New Today',
      value: newLeadsToday.toLocaleString(),
      trend: trends?.newToday.value ?? '+0%',
      positive: trends?.newToday.positive ?? true,
      comparison: 'vs yesterday',
      icon: TrendingUp,
      accent: 'success',
      sparkData: sparklines?.newToday ?? [1, 2, 1, 3, 2, 4, newLeadsToday],
      colorIndex: 1,
    },
    {
      label: 'In Progress',
      value: inProgressCount.toLocaleString(),
      trend: trends?.inProgress.value ?? '+0%',
      positive: trends?.inProgress.positive ?? true,
      comparison: comparisonLabel,
      icon: Activity, // You can change this if you have another icon for In Progress
      accent: 'secondary',
      sparkData: sparklines?.inProgress ?? [5, 4, 6, 3, 5, 4, inProgressCount],
      colorIndex: 2,
    },
    {
      label: 'Closed',
      value: closedCount.toLocaleString(),
      trend: trends?.closed.value ?? '+0%',
      positive: trends?.closed.positive ?? true,
      comparison: comparisonLabel,
      icon: CheckCircle2, // Can be changed as well
      accent: 'danger',
      sparkData: sparklines?.closed ?? [2, 3, 1, 4, 5, 2, closedCount],
      colorIndex: 3,
    },
  ]


  return (
    <DashboardShell>
      <OverviewHeader
        dateRange={safeDateRange}
        onDateRangeChange={handleRangeChange}
        onExport={handleExport}
        exportingPipeline={exportingPipeline}
        exportingAgent={exportingAgent}
      />

      <MetricCardsGrid metrics={metricCards} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-10">
        <LeadDistributionCard
          unassignedCount={donutUnassignedCount}
          breakdown={breakdown}
          unassignedBreakdown={unassignedBreakdown}
          totalLeads={donutTotalLeads}
          tenantSlug={tenantSlug}
          className="lg:col-span-7"
        />
        <LeadDistributionCard
          title="Period Distribution"
          description="Leads in selected period"
          unassignedCount={filteredDonutUnassignedCount}
          breakdown={filteredBreakdown}
          unassignedBreakdown={filteredUnassignedBreakdown}
          totalLeads={filteredDonutTotalLeads}
          tenantSlug={tenantSlug}
          className="lg:col-span-3"
          compact={true}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TeamPerformanceTable
          rows={teamPerformance}
          tenantSlug={tenantSlug}
          className="lg:col-span-3"
        />
        <TeamSnapshot
          counselorCount={agentStats.length}
          pipelineValue={pipelineValue}
          conversionRate={conversionRate}
          className="lg:col-span-1"
        />
      </div>
    </DashboardShell>
  )
}
