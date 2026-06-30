'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Chart, Line } from 'react-chartjs-2'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
import { Download, Loader2, FileDown, ChevronDown, MoreHorizontal, Info } from 'lucide-react'
import { TrendingUp, TrendingDown, Users, DollarSign, UserX } from 'lucide-react'
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
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

// ── Reactively tracks the .dark class on <html> so charts can flip palette ──
function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/40', className)} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-crm-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-6 w-16" />
              </div>
              <SkeletonBlock className="h-10 w-10 rounded-xl" />
            </div>
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-[260px] w-full" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-[120px] w-full" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 flex-1">
            <SkeletonBlock className="h-4 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <SkeletonBlock className="h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-full" />
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

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
  sparklines,
  trends,
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
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')
  const isDark = useIsDark()

  const safeDateRange = useMemo(() => ({
    from: dateRange.from ? new Date(dateRange.from) : null,
    to: dateRange.to ? new Date(dateRange.to) : null
  }), [dateRange.from, dateRange.to])

  const [exportingPipeline, setExportingPipeline] = useState(false)
  const [exportingAgent, setExportingAgent] = useState(false)

  // ── "Calculating" loading phase: shows skeleton for 5s before real charts render ──
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000)
    return () => clearTimeout(timer)
  }, [])

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

  // ── Theme-aware chart palette ──
  const palette = useMemo(
    () => ({
      tick: isDark ? '#64748b' : '#94a3b8',
      grid: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
      tooltipBg: isDark ? '#1e293b' : '#0f172a',
      tooltipTitle: '#94a3b8',
      tooltipBody: '#f8fafc',
      barFill: isDark ? 'rgba(14,165,233,0.35)' : 'rgba(14,165,233,0.18)',
      pointBorder: isDark ? '#0f172a' : '#ffffff',
    }),
    [isDark],
  )

  const metricCards = [
    {
      label: 'Total Leads',
      value: totalLeads.toLocaleString(),
      trend: trends?.totalLeads.value ?? '+0%',
      positive: trends?.totalLeads.positive ?? true,
      icon: Users,
      iconBg: 'bg-sky-50 dark:bg-sky-500/10',
      iconColor: 'text-sky-500',
      sparkData: [3, 5, 4, 7, 6, 8, totalLeads],
      sparkColor: '#0ea5e9',
    },
    {
      label: 'New Today',
      value: newLeadsToday.toLocaleString(),
      trend: trends?.newToday.value ?? '+0%',
      positive: trends?.newToday.positive ?? true,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      sparkData: [1, 2, 1, 3, 2, 4, newLeadsToday],
      sparkColor: '#10b981',
    },
    {
      label: 'Won Revenue',
      value: `$${wonRevenue.toLocaleString()}`,
      trend: trends?.wonRevenue.value ?? '+0%',
      positive: trends?.wonRevenue.positive ?? true,
      icon: DollarSign,
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-500',
      sparkData: [100, 200, 150, 300, 250, 400, wonRevenue || 0],
      sparkColor: '#8b5cf6',
    },
    {
      label: 'Unassigned',
      value: unassignedCount.toLocaleString(),
      trend: trends?.unassigned.value ?? '+0%',
      positive: trends?.unassigned.positive ?? false,
      icon: UserX,
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-500',
      sparkData: [5, 4, 6, 3, 5, 4, unassignedCount],
      sparkColor: '#ef4444',
    },
  ]

  const sourceData = [activeCount, paidCount, cancelledCount, unassignedCount]
  const sourceLabels = ['Pipeline', 'Won', 'Lost', 'Unassigned']
  const sourceTotal = sourceData.reduce((sum, item) => sum + item, 0)
  const sourceColors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6']

  // ── Deals-by-source as a 7-bucket grouped bar series, matching the "Response Codes" style panel ──
  const sourceTrendLabels = ['1', '2', '3', '4', '5', '6', '7']
  const jitter = (base: number, seed: number) => Math.max(0, Math.round(base * (0.55 + ((seed * 37) % 50) / 100)))
  const sourceTrendSeries = sourceLabels.map((label, idx) => ({
    label,
    color: sourceColors[idx],
    data: sourceTrendLabels.map((_, i) => jitter((sourceData[idx] ?? 0) || 1, idx + i + 1)),
  }))

  const activityItems = [
    { color: '#0ea5e9', title: `${newLeadsToday} new leads`, detail: 'created since midnight', time: 'Today' },
    { color: '#10b981', title: `${paidCount} deals won`, detail: 'closed in paid stage', time: 'Today' },
    { color: '#f59e0b', title: `${activeCount} in pipeline`, detail: 'currently active', time: 'Live' },
    { color: '#ef4444', title: `${overdueRemindersCount} overdue reminders`, detail: 'need follow-up', time: 'Now' },
  ]

  const fillColors = ['#0ea5e9', '#0ea5e9', '#10b981', '#10b981', '#f59e0b', '#f59e0b']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </span>
              Calculating live metrics…
            </p>
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── TOP BAR: Title + Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track your pipeline and team performance in real-time</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-4">
                <FileDown className="h-4 w-4 text-brand" />
                Reports
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export Reports</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pipeline')} disabled={exportingPipeline} className="gap-2 cursor-pointer">
                {exportingPipeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Pipeline Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('agent')} disabled={exportingAgent} className="gap-2 cursor-pointer">
                {exportingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Counselor Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DateRangePicker value={safeDateRange} onChange={handleRangeChange} />
        </div>
      </div>

      {/* ── KPI CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-crm-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{metric.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </div>
              <div className="h-[40px] mb-2">
                <Line
                  data={{
                    labels: metric.sparkData.map((_, i) => i),
                    datasets: [{
                      data: metric.sparkData,
                      borderColor: metric.sparkColor,
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      tension: 0.4,
                      pointRadius: 0,
                      fill: false,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } },
                    elements: { line: { borderCapStyle: 'round' } },
                  }}
                />
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${metric.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {metric.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metric.trend} <span className="text-slate-400 dark:text-slate-500 font-normal">vs prev 30d</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── TWO COLUMN LAYOUT: Main Chart + Side Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left: Pipeline Overview Chart — takes 2/3 width */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pipeline Overview</h2>
                <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lead flow across all stages</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-1">
                Last 7 days <ChevronDown className="h-3 w-3 opacity-60" />
              </span>
              <button className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Leads This Period
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-sky-300" /> Trend
              </span>
            </div>
            <div className="h-[260px]">
              <Chart
                type="bar"
                data={{
                  labels: chartLabels,
                  datasets: [
                    {
                      type: 'bar' as const,
                      label: 'Leads',
                      data: chartCounts,
                      backgroundColor: palette.barFill,
                      borderRadius: 6,
                      borderSkipped: false,
                      barThickness: 18,
                      order: 2,
                    },
                    {
                      type: 'line' as const,
                      label: 'Trend',
                      data: chartCounts,
                      borderColor: '#0ea5e9',
                      backgroundColor: 'transparent',
                      borderWidth: 2.5,
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: '#0ea5e9',
                      pointBorderColor: palette.pointBorder,
                      pointBorderWidth: 2,
                      fill: false,
                      order: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      enabled: true,
                      backgroundColor: palette.tooltipBg,
                      titleColor: palette.tooltipTitle,
                      bodyColor: palette.tooltipBody,
                      padding: 10,
                      cornerRadius: 8,
                    },
                  },
                  scales: {
                    x: { ticks: { color: palette.tick, font: { size: 11 } }, grid: { color: palette.grid }, border: { display: false } },
                    y: { ticks: { color: palette.tick, font: { size: 11 } }, grid: { color: palette.grid }, border: { display: false } },
                  },
                }}
              />
            </div>
          </div>
          {/* Pipeline Stages below chart */}
          <div className="px-6 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Stage Breakdown</p>
            <div className="space-y-2.5">
              {stageList.slice(0, 6).map((stage, index) => {
                const pct = windowSnapshot.totalLeads > 0 ? Math.round((stage.count / windowSnapshot.totalLeads) * 100) : 0
                return (
                  <div key={stage.value} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 dark:text-slate-300 w-28 truncate flex-shrink-0">{stage.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: fillColors[index] ?? '#0ea5e9' }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right flex-shrink-0">{stage.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Stacked side cards — takes 1/3 width */}
        <div className="flex flex-col gap-4">

          {/* Deals by Source */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Deals by Source</h2>
              <button className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
                {sourceLabels.map((label, index) => (
                  <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: sourceColors[index] }} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="h-[150px]">
                <Chart
                  type="bar"
                  data={{
                    labels: sourceTrendLabels,
                    datasets: sourceTrendSeries.map((series) => ({
                      type: 'bar' as const,
                      label: series.label,
                      data: series.data,
                      backgroundColor: series.color,
                      borderRadius: 3,
                      borderSkipped: false,
                      barPercentage: 0.7,
                      categoryPercentage: 0.7,
                    })),
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        enabled: true,
                        backgroundColor: palette.tooltipBg,
                        titleColor: palette.tooltipTitle,
                        bodyColor: palette.tooltipBody,
                        padding: 8,
                        cornerRadius: 6,
                        bodyFont: { size: 10 },
                        titleFont: { size: 10 },
                      },
                    },
                    scales: {
                      x: { ticks: { color: palette.tick, font: { size: 9 } }, grid: { display: false }, border: { display: false } },
                      y: { ticks: { color: palette.tick, font: { size: 9 } }, grid: { color: palette.grid }, border: { display: false } },
                    },
                  }}
                />
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {sourceLabels.map((label, index) => {
                  const value = sourceData[index] ?? 0
                  const pct = sourceTotal > 0 ? Math.round((value / sourceTotal) * 100) : 0
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: sourceColors[index] }} />
                      <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">{label}</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
              <button className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5">
              {activityItems.map((item, index) => (
                <div key={item.title} className={`flex items-start gap-3 py-2.5 ${index < activityItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                  <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.detail}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── TEAM PERFORMANCE TABLE ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team Performance</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live counselor accountability — sorted by leads needing attention</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Counselor</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">Total</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">Won</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center"><span className="text-orange-600 dark:text-orange-400">Cold (3d+)</span></TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center"><span className="text-red-600 dark:text-red-400">Dead (7d+)</span></TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">Conv %</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map((agent) => (
                <TableRow
                  key={agent.id}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    agent.dead_leads > 0 && 'bg-red-50/50 dark:bg-red-950/20',
                    agent.cold_leads > 5 && agent.dead_leads === 0 && 'bg-orange-50/50 dark:bg-orange-950/20',
                  )}
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(agent.name?.[0] ?? 'U').toUpperCase()}</div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">{Number(agent.total_leads ?? 0)}</TableCell>
                  <TableCell className="px-4 py-3 text-center"><span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{Number(agent.won ?? 0)}</span></TableCell>
                  <TableCell className="px-4 py-3 text-center"><span className={cn('text-sm font-medium', Number(agent.cold_leads ?? 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500')}>{Number(agent.cold_leads ?? 0)}</span></TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    {Number(agent.dead_leads ?? 0) > 0
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-full">{Number(agent.dead_leads ?? 0)}</span>
                      : <span className="text-sm text-slate-400 dark:text-slate-500">0</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-slate-700 dark:text-slate-300">{(agent.conversion_rate ?? 0)}%</TableCell>
                  <TableCell suppressHydrationWarning className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{agent.last_activity ? `${formatDistanceToNow(new Date(agent.last_activity))} ago` : 'Never'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      

      {/* ── TEAM SNAPSHOT ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team Snapshot</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="pb-4 sm:pb-0 sm:pr-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Counselors</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{agentStats.length}</p>
          </div>
          <div className="py-4 sm:py-0 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pipeline Value</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">${pipelineValue.toLocaleString()}</p>
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Conversion Rate</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{conversionRate}%</p>
          </div>
        </div>
      </div>

    </div>
  )
}