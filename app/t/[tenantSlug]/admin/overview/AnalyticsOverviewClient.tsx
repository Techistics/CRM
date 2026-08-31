'use client'

import { useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
import { DollarSign, TrendingUp, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/consulty-dashboard/ui/dashboard-shell'
import { OverviewHeader } from '@/components/consulty-dashboard/overview-header'
import { MetricCardsGrid, type MetricCardData } from '@/components/consulty-dashboard/metric-card'
import { LeadDistributionCard } from '@/components/consulty-dashboard/lead-distribution-card'
import { LeadStatusChart } from '@/components/consulty-dashboard/lead-status-chart'
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
  conversionRate,
  teamPerformance,
  sparklines,
  trends,
  dateRange,
  agentStageBreakdown,
  unassignedBreakdown = [],
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
  conversionRate: number
  teamPerformance: Array<{
    id: string
    name: string
    email: string
    total_leads: number
    won: number
    cold_leads: number
    dead_leads: number
    conversion_rate: number | null
    last_activity: string | null
  }>
  sparklines?: {
    totalLeads: number[]
    newToday: number[]
    wonRevenue: number[]
    unassigned: number[]
  }
  trends?: {
    totalLeads: { value: string; positive: boolean }
    newToday: { value: string; positive: boolean }
    wonRevenue: { value: string; positive: boolean }
    unassigned: { value: string; positive: boolean }
  }
  dateRange: { from: Date | string | null; to: Date | string | null }
  agentStageBreakdown?: Array<{
    agentId: string | null
    agentName: string
    totalLeads: number
    stages: Array<{ key: string; label: string; count: number }>
  }>
  unassignedBreakdown?: Array<{ key: string; label: string; count: number }>
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
      label: 'Won Revenue',
      value: `$${wonRevenue.toLocaleString()}`,
      trend: trends?.wonRevenue.value ?? '+0%',
      positive: trends?.wonRevenue.positive ?? true,
      comparison: comparisonLabel,
      icon: DollarSign,
      accent: 'secondary',
      sparkData: sparklines?.wonRevenue ?? [100, 200, 150, 300, 250, 400, wonRevenue || 0],
      colorIndex: 2,
    },
    {
      label: 'Unassigned',
      value: unassignedCount.toLocaleString(),
      trend: trends?.unassigned.value ?? '+0%',
      positive: trends?.unassigned.positive ?? false,
      comparison: comparisonLabel,
      icon: UserX,
      accent: 'danger',
      sparkData: sparklines?.unassigned ?? [5, 4, 6, 3, 5, 4, unassignedCount],
      colorIndex: 3,
    },
  ]

  const totalLeadsAssigned = teamPerformance.reduce((sum, r) => sum + Number(r.total_leads || 0), 0)
  const totalDead = teamPerformance.reduce((sum, r) => sum + Number(r.dead_leads || 0), 0)
  const totalColdRaw = teamPerformance.reduce((sum, r) => sum + Number(r.cold_leads || 0), 0)

  const dead = totalDead
  const cold = Math.max(0, totalColdRaw - totalDead)
  const activeLeads = Math.max(0, totalLeadsAssigned - totalColdRaw)

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
        <div className="lg:col-span-3">
          <LeadStatusChart active={activeLeads} cold={cold} dead={dead} />
        </div>
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
