'use client'

import { useMemo, useState } from 'react'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
import { Download, Loader2, FileDown, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { AgentStat, ChartWindow, PipelineChartSnapshot } from '@/types/analytics'
import { DateRangePicker } from '@/components/analytics/DateRangePicker'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

export default function AnalyticsOverviewClient({
  chartByWindow,
  overdueRemindersCount,
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
  dateRange,
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
  dateRange: { from: Date | null; to: Date | null }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')

  const [exportingPipeline, setExportingPipeline] = useState(false)
  const [exportingAgent, setExportingAgent] = useState(false)

  const handleExport = async (type: 'pipeline' | 'agent') => {
    const setLoader = type === 'pipeline' ? setExportingPipeline : setExportingAgent
    setLoader(true)

    try {
      const q = new URLSearchParams()
      if (dateRange.from) q.set('from', dateRange.from.toISOString().split('T')[0])
      if (dateRange.to) q.set('to', dateRange.to.toISOString().split('T')[0])
      q.set('tenantSlug', tenantSlug)

      const url = `/api/reports/${type}-export?${q.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      const filename = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}-report.csv`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setLoader(false)
    }
  }

  const handleRangeChange = (range: { from: Date | null; to: Date | null }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (range.from) params.set('from', range.from.toISOString().split('T')[0])
    else params.delete('from')
    if (range.to) params.set('to', range.to.toISOString().split('T')[0])
    else params.delete('to')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const windowSnapshot = chartByWindow.week
  const stageList = windowSnapshot.stageData
  const chartLabels = windowSnapshot.funnelSteps.map((step) => step.label)
  const chartCounts = windowSnapshot.funnelSteps.map((step) => step.count)

  const styleVars = useMemo(() => {
    if (typeof window === 'undefined') return null
    const s = getComputedStyle(document.documentElement)
    return {
      linePrimary: s.getPropertyValue('--line-primary').trim(),
      chartPrimary: s.getPropertyValue('--chart-primary').trim(),
      chartPrimarySoft: s.getPropertyValue('--chart-primary-soft').trim(),
      chartSecondary: s.getPropertyValue('--chart-secondary').trim(),
      chartTertiary: s.getPropertyValue('--chart-tertiary').trim(),
      chartQuaternary: s.getPropertyValue('--chart-quaternary').trim(),
      mutedText: s.getPropertyValue('--muted-text').trim(),
      divider: s.getPropertyValue('--divider-color').trim(),
    }
  }, [])

  const metricCards = [
    { label: 'Total Leads', value: totalLeads.toLocaleString(), trend: '+8.2%', positive: true },
    { label: 'New Today', value: newLeadsToday.toLocaleString(), trend: '+2.4%', positive: true },
    { label: 'Won Revenue', value: `$${wonRevenue.toLocaleString()}`, trend: '+6.1%', positive: true },
    { label: 'Unassigned', value: unassignedCount.toLocaleString(), trend: '-1.6%', positive: false },
  ]

  const sourceData = [activeCount, paidCount, cancelledCount, unassignedCount]
  const sourceLabels = ['Pipeline', 'Won', 'Lost', 'Unassigned']
  const sourceTotal = sourceData.reduce((sum, item) => sum + item, 0)

  const activityItems = [
    { color: 'var(--chart-primary)', title: `${newLeadsToday} new leads`, detail: 'created since midnight', time: 'Today' },
    { color: 'var(--chart-secondary)', title: `${paidCount} deals won`, detail: 'closed in paid stage', time: 'Today' },
    { color: 'var(--chart-tertiary)', title: `${activeCount} in pipeline`, detail: 'currently active', time: 'Live' },
    { color: 'var(--danger)', title: `${overdueRemindersCount} overdue reminders`, detail: 'need follow-up', time: 'Now' },
  ]

  return (
    <div className="space-y-[var(--gap)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-strong)] tracking-tight">Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track your pipeline and team performance in real-time</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-700 font-medium px-4"
              >
                <FileDown className="h-4 w-4 text-blue-600" />
                Reports
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export Reports</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleExport('pipeline')}
                disabled={exportingPipeline}
                className="gap-2 cursor-pointer"
              >
                {exportingPipeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Pipeline Report
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('agent')}
                disabled={exportingAgent}
                className="gap-2 cursor-pointer"
              >
                {exportingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Agent Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DateRangePicker value={dateRange} onChange={handleRangeChange} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 py-[14px]"
          >
            <p className="mb-[6px] text-[11px] font-normal text-[var(--muted-text)]">{metric.label}</p>
            <p className="text-[22px] font-medium leading-none text-[var(--text-strong)]">{metric.value}</p>
            <div
              className="mt-[10px] flex items-center gap-2 text-[11px] font-normal"
              style={{ color: metric.positive ? 'var(--positive)' : 'var(--negative)' }}
            >
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: metric.positive ? 'var(--positive)' : 'var(--negative)' }}
              />
              {metric.trend}
            </div>
          </div>
        ))}
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Team Performance
          </CardTitle>
          <CardDescription>
            Live agent accountability — sorted by leads needing attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Won</TableHead>
                <TableHead className="text-center">
                  <span className="text-orange-600">Cold (3d+)</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-red-600">Dead (7d+)</span>
                </TableHead>
                <TableHead className="text-center">Conv %</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map((agent) => (
                <TableRow
                  key={agent.id}
                  className={cn(
                    agent.dead_leads > 0 && 'bg-red-50/50 dark:bg-red-900/10',
                    agent.cold_leads > 5 && agent.dead_leads === 0 && 'bg-orange-50/50 dark:bg-orange-900/10',
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {(agent.name?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {Number(agent.total_leads ?? 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-green-600 font-medium">
                      {Number(agent.won ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        Number(agent.cold_leads ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground',
                      )}
                    >
                      {Number(agent.cold_leads ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {Number(agent.dead_leads ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        ❄️ {Number(agent.dead_leads ?? 0)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(agent.conversion_rate ?? 0)}%
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {agent.last_activity
                      ? `${formatDistanceToNow(new Date(agent.last_activity))} ago`
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-[var(--gap)] xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-[var(--card-padding)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-[var(--text-strong)]">Revenue</h2>
            <span className="text-[11px] font-normal text-[var(--muted-text)]">Last 7 days</span>
          </div>
          <div className="h-[230px]">
            <Line
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartCounts,
                    borderColor: styleVars?.linePrimary ?? 'var(--line-primary)',
                    backgroundColor: styleVars?.chartPrimarySoft ?? 'var(--chart-primary-soft)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: {
                    ticks: { color: styleVars?.mutedText ?? 'var(--muted-text)', font: { size: 11, weight: 400 } },
                    grid: { color: styleVars?.divider ?? 'var(--divider-color)' },
                    border: { display: false },
                  },
                  y: {
                    ticks: { color: styleVars?.mutedText ?? 'var(--muted-text)', font: { size: 11, weight: 400 } },
                    grid: { color: styleVars?.divider ?? 'var(--divider-color)' },
                    border: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-[var(--card-padding)]">
          <div className="mb-3">
            <h2 className="text-[13px] font-medium text-[var(--text-strong)]">Deals by source</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[180px] w-[180px]">
              <Doughnut
                data={{
                  labels: sourceLabels,
                  datasets: [
                    {
                      data: sourceData,
                      backgroundColor: [
                        styleVars?.chartPrimary ?? 'var(--chart-primary)',
                        styleVars?.chartSecondary ?? 'var(--chart-secondary)',
                        styleVars?.chartTertiary ?? 'var(--chart-tertiary)',
                        styleVars?.chartQuaternary ?? 'var(--chart-quaternary)',
                      ],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '72%',
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {sourceLabels.map((label, index) => {
                const value = sourceData[index] ?? 0
                const pct = sourceTotal > 0 ? Math.round((value / sourceTotal) * 100) : 0
                const colors = [
                  'var(--chart-primary)',
                  'var(--chart-secondary)',
                  'var(--chart-tertiary)',
                  'var(--chart-quaternary)',
                ]
                return (
                  <div key={label} className="flex items-center gap-2 text-[11px] font-normal text-[var(--text-strong)]">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: colors[index] }} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="text-[var(--muted-text)]">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[var(--gap)] xl:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-[var(--card-padding)]">
          <h2 className="mb-3 text-[13px] font-medium text-[var(--text-strong)]">Pipeline stages</h2>
          <div className="space-y-3">
            {stageList.slice(0, 6).map((stage, index) => {
              const pct = windowSnapshot.totalLeads > 0 ? Math.round((stage.count / windowSnapshot.totalLeads) * 100) : 0
              const fillColors = ['var(--chart-primary)', 'var(--chart-primary)', 'var(--chart-secondary)', 'var(--chart-secondary)', 'var(--chart-tertiary)', 'var(--chart-tertiary)']
              return (
                <div key={stage.value}>
                  <div className="mb-[6px] flex items-center justify-between text-[11px] font-normal">
                    <span className="text-[var(--text-strong)]">{stage.label}</span>
                    <span className="text-[var(--muted-text)]">{stage.count}</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-[3px] bg-[var(--main-bg)]">
                    <div
                      className="h-[6px] rounded-[3px]"
                      style={{ width: `${pct}%`, background: fillColors[index] ?? 'var(--chart-tertiary)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-[var(--card-padding)]">
          <h2 className="mb-3 text-[13px] font-medium text-[var(--text-strong)]">Recent activity</h2>
          <div>
            {activityItems.map((item, index) => (
              <div
                key={item.title}
                className="flex items-start gap-2 py-[10px]"
                style={{
                  borderBottom:
                    index === activityItems.length - 1
                      ? 'none'
                      : '0.5px solid var(--divider-color)',
                }}
              >
                <span className="mt-[5px] h-[6px] w-[6px] rounded-full" style={{ background: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-normal text-[var(--text-strong)]">{item.title}</p>
                  <p className="text-[11px] font-normal text-[var(--muted-text)]">{item.detail}</p>
                </div>
                <span className="text-[11px] font-normal text-[var(--muted-text)]">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-[var(--card-padding)]">
        <h2 className="mb-3 text-[13px] font-medium text-[var(--text-strong)]">Team snapshot</h2>
        <div className="grid grid-cols-1 gap-[var(--gap)] md:grid-cols-3">
          <div>
            <p className="text-[11px] text-[var(--muted-text)]">Agents</p>
            <p className="text-[22px] font-medium leading-none">{agentStats.length}</p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--muted-text)]">Pipeline value</p>
            <p className="text-[22px] font-medium leading-none">${pipelineValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--muted-text)]">Conversion</p>
            <p className="text-[22px] font-medium leading-none">{conversionRate}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
