'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  UserPlus,
  Users,
  Activity,
  UserRoundX,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { tenantPath } from '@/lib/tenant-path'

import type { AgentStat, ChartWindow, PipelineChartSnapshot } from '@/types/analytics'

export default function AnalyticsOverviewClient({
  tenantSlug,
  chartByWindow,
  overdueRemindersCount,
  totalLeads,
  activeCount,
  paidCount,
  cancelledCount,
  newLeadsToday,
  unassignedCount,
  agentStats,
}: {
  tenantSlug: string
  chartByWindow: Record<ChartWindow, PipelineChartSnapshot>
  overdueRemindersCount: number
  totalLeads: number
  activeCount: number
  paidCount: number
  cancelledCount: number
  newLeadsToday: number
  unassignedCount: number
  agentStats: AgentStat[]
}) {
  const router = useRouter()
  const [chartWindow, setChartWindow] = useState<ChartWindow>('week')

  /** Funnel for leads created in the selected time window (cohort-style). */
  const unifiedChartData = useMemo(() => {
    const snap = chartByWindow[chartWindow]
    const { totalLeads: tw, stageData: sd, funnelSteps: fs } = snap

    const get = (value: string) =>
      sd.find((s) => s.value === value)?.count ?? 0

    const walkin = get('walkin_booked') + get('walkin_conducted')
    const paid = get('paid')

    const contactedLike =
      [
        'follow_up',
        'docs_received',
        'options_sent',
        'final_decision',
        'walkin_booked',
        'walkin_conducted',
        'paid',
      ].reduce((acc, v) => acc + get(v), 0)

    const pipelineAtMilestone = [tw, contactedLike, walkin, paid]

    return fs.map((step, i) => {
      const short =
        step.label.length > 20
          ? `${step.label.slice(0, 18)}…`
          : step.label
      return {
        label: short,
        fullLabel: step.label,
        funnel: step.count,
        pipeline: pipelineAtMilestone[i] ?? 0,
        conversion: step.pct,
      }
    })
  }, [chartByWindow, chartWindow])

  const activePct =
    totalLeads > 0 ? Math.round((activeCount / totalLeads) * 100) : 0
  const unassignedPct =
    totalLeads > 0 ? Math.round((unassignedCount / totalLeads) * 100) : 0

  const kpiItems = [
    {
      title: 'New leads today',
      value: newLeadsToday,
      hint: 'Created since midnight',
      trend: 'neutral' as const,
      icon: UserPlus,
    },
    {
      title: 'Total leads',
      value: totalLeads.toLocaleString(),
      hint: `${paidCount.toLocaleString()} paid · ${cancelledCount.toLocaleString()} cancelled`,
      trend: 'positive' as const,
      icon: Users,
    },
    {
      title: 'Active pipeline',
      value: activeCount.toLocaleString(),
      hint: `${activePct}% of all leads`,
      trend: 'positive' as const,
      icon: Activity,
    },
    {
      title: 'Unassigned',
      value: unassignedCount.toLocaleString(),
      hint:
        unassignedCount > 0
          ? `${unassignedPct}% need assignment`
          : 'All leads assigned',
      trend: unassignedCount > 0 ? ('negative' as const) : ('positive' as const),
      icon: UserRoundX,
    },
    {
      title: 'Overdue follow-ups',
      value: overdueRemindersCount.toLocaleString(),
      hint:
        overdueRemindersCount > 0
          ? 'Reminders past due (all leads)'
          : 'No overdue reminders',
      trend: overdueRemindersCount > 0 ? ('negative' as const) : ('positive' as const),
      icon: Bell,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your platform statistics and performance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiItems.map((item) => (
          <Card key={item.title} className="border shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight">{item.value}</p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  item.trend === 'positive' && 'text-emerald-600',
                  item.trend === 'negative' && 'text-red-600',
                  item.trend === 'neutral' && 'text-muted-foreground',
                )}
              >
                {item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="w-full">
        <Card className="w-full border shadow-sm">
          <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Pipeline &amp; conversion</CardTitle>
              <CardDescription>
                Funnel milestones with pipeline stage counts and share of total
              </CardDescription>
            </div>
            <div
              className="flex shrink-0 gap-1 rounded-lg border bg-muted/50 p-1"
              role="group"
              aria-label="Chart window"
            >
              {(
                [
                  ['week', 'Week'],
                  ['month', 'Month'],
                  ['year', 'Year'],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={chartWindow === key ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 min-w-[4rem] px-3 text-xs font-medium',
                    chartWindow === key && 'shadow-sm',
                  )}
                  onClick={() => setChartWindow(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[min(420px,55vh)] w-full min-h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={unifiedChartData}
                  margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 6"
                    vertical
                    horizontal={false}
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11,
                    }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11,
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11,
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { fullLabel?: string }
                        | undefined
                      return row?.fullLabel ?? ''
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="funnel"
                    name="Funnel volume"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pipeline"
                    name="Pipeline (stages)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversion"
                    name="Share of total"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {chartWindow === 'week'
                  ? 'Last 7 days'
                  : chartWindow === 'month'
                    ? 'Last 30 days'
                    : 'Last 12 months'}
              </span>
              {' · '}
              Funnel counts include only leads created in this period. KPI cards above remain
              all-time for the workspace.
            </p>
          </CardContent>
        </Card>

      </div>

      <Card className="border shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Agent performance</CardTitle>
              <CardDescription>
                Click an agent to view assigned leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {agentStats.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No agents yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Total Leads</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Cancelled</TableHead>
                  <TableHead>Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentStats.map((agent) => {
                  const conversionPct =
                    agent.total > 0
                      ? Math.round((agent.paid / agent.total) * 100)
                      : 0

                  return (
                    <TableRow
                      key={agent.id}
                      className="cursor-pointer hover:bg-muted/50"
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(
                          `${tenantPath(tenantSlug, '/admin/leads')}?assignedTo=${agent.id}`,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(
                            `${tenantPath(tenantSlug, '/admin/leads')}?assignedTo=${agent.id}`,
                          )
                        }
                      }}
                      aria-label={`View assigned leads for ${agent.name}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-foreground">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.email ?? ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{agent.total}</TableCell>
                      <TableCell className="text-blue-600">{agent.active}</TableCell>
                      <TableCell className="text-emerald-600">{agent.paid}</TableCell>
                      <TableCell className="text-red-600">{agent.cancelled}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${conversionPct}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs text-muted-foreground">
                            {conversionPct}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
