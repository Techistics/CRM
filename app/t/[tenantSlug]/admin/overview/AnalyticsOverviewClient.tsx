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
import { toast } from 'sonner'
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
      toast.success(`${type === 'pipeline' ? 'Pipeline' : 'Counselor'} report downloaded`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
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
    <div className="space-y-6">
      <div className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-strong)] sm:text-2xl">Overview</h1>
          <p className="mt-0.5 text-xs text-gray-500">Track your pipeline and team performance in real-time</p>
        </div>
        
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4"
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
                Counselor Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-full min-w-0 sm:w-auto">
            <DateRangePicker value={dateRange} onChange={handleRangeChange} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-crm-sm dark:bg-[#0b0f19] dark:border-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{metric.label}</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{metric.value}</p>
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

      <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Team Performance
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Live counselor accountability — sorted by leads needing attention
          </p>
        </div>
        <div className="p-6">
          <div className="crm-table-scroll">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Counselor</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">Total</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">Won</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
                  <span className="text-orange-600">Cold (3d+)</span>
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
                  <span className="text-red-600">Dead (7d+)</span>
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">Conv %</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map((agent) => (
                <TableRow
                  key={agent.id}
                  className={cn(
                    'hover:bg-slate-50',
                    agent.dead_leads > 0 && 'bg-red-50/50 dark:bg-red-900/10',
                    agent.cold_leads > 5 && agent.dead_leads === 0 && 'bg-orange-50/50 dark:bg-orange-900/10',
                  )}
                >
                  <TableCell className="px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {(agent.name?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 text-center">
                    {Number(agent.total_leads ?? 0)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 text-center">
                    <span className="text-sm text-green-600 font-medium">
                      {Number(agent.won ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 text-center">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        Number(agent.cold_leads ?? 0) > 0 ? 'text-orange-600' : 'text-muted-foreground',
                      )}
                    >
                      {Number(agent.cold_leads ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 text-center">
                    {Number(agent.dead_leads ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        ❄️ {Number(agent.dead_leads ?? 0)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 text-center">
                    {(agent.conversion_rate ?? 0)}%
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700">
                    {agent.last_activity
                      ? `${formatDistanceToNow(new Date(agent.last_activity))} ago`
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.6fr_1fr]">
        <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Revenue</h2>
            <span className="text-xs text-slate-500">Last 7 days</span>
          </div>
          <div className="p-6">
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
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Deals by source</h2>
          </div>
          <div className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="h-[160px] w-[160px] shrink-0 sm:h-[180px] sm:w-[180px]">
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
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline stages</h2>
          </div>
          <div className="p-6">
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
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent activity</h2>
          </div>
          <div className="p-6">
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
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0b0f19] dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team snapshot</h2>
        </div>
        <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Counselors</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{agentStats.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pipeline value</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">${pipelineValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Conversion</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{conversionRate}%</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
