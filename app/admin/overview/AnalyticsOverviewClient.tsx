'use client'

import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type StageDatum = {
  value: string
  label: string
  count: number
  color: string // hex color for chart
}

type AgentStat = {
  id: string
  name: string
  email: string | null
  total: number
  active: number
  paid: number
  cancelled: number
}

type FunnelStep = {
  label: string
  count: number
  pct: number
  colorClass: string
}

export default function AnalyticsOverviewClient({
  totalLeads,
  activeCount,
  paidCount,
  cancelledCount,
  stageData,
  funnelSteps,
  agentStats,
}: {
  totalLeads: number
  activeCount: number
  paidCount: number
  cancelledCount: number
  stageData: StageDatum[]
  funnelSteps: FunnelStep[]
  agentStats: AgentStat[]
}) {
  const router = useRouter()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-gray-400 text-sm mt-1">
          Admin dashboard analytics
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Leads', value: totalLeads, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-blue-400' },
          { label: 'Paid', value: paidCount, color: 'text-emerald-400' },
          {
            label: 'Cancelled',
            value: cancelledCount,
            color: 'text-red-400',
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leads by stage graph */}
        <Card>
          <CardHeader>
            <CardTitle>Leads by stage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: '#9ca3af' }} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={140}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    // `recharts` types are strict here; we always return a string label.
                    formatter={(value) => [String(value), 'Leads']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                    {stageData.map((entry) => (
                      <Cell key={entry.value} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {funnelSteps.map((step) => (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">{step.label}</span>
                    <span className="text-gray-500">
                      {step.count} ({step.pct}%)
                    </span>
                  </div>
                  <div className="h-6 bg-gray-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${step.colorClass} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{
                        width: `${Math.max(step.pct, step.count > 0 ? 4 : 0)}%`,
                      }}
                    >
                      {step.pct >= 10 && (
                        <span className="text-white text-xs font-medium">
                          {step.pct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent performance */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle>Agent performance</CardTitle>
            <span className="text-xs text-gray-500">
              Click an agent to view assigned leads
            </span>
          </div>
        </div>

        {agentStats.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600 text-sm">
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
                      className="cursor-pointer hover:bg-gray-800/40 transition-colors"
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/admin/leads?assignedTo=${agent.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(
                            `/admin/leads?assignedTo=${agent.id}`
                          )
                        }
                      }}
                      aria-label={`View assigned leads for ${agent.name}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-semibold text-xs">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{agent.name}</p>
                            <p className="text-gray-500 text-xs">
                              {agent.email ?? ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {agent.total}
                      </TableCell>
                      <TableCell className="text-blue-400">
                        {agent.active}
                      </TableCell>
                      <TableCell className="text-emerald-400">
                        {agent.paid}
                      </TableCell>
                      <TableCell className="text-red-400">
                        {agent.cancelled}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${conversionPct}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-400 text-xs w-8">
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

