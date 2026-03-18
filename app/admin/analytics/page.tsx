import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq, count, and, not, inArray } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Leads by stage
  const byStage = await db
    .select({ stage: leads.stage, total: count(leads.id) })
    .from(leads)
    .groupBy(leads.stage)

  // Total leads
  const totalLeads = byStage.reduce((sum, s) => sum + Number(s.total), 0)

  // Assigned vs unassigned
  const assignedCount = await db
    .select({ total: count(leads.id) })
    .from(leads)
    .where(not(eq(leads.assignedTo, leads.assignedTo)))

  const unassigned = await db
    .select({ total: count(leads.id) })
    .from(leads)
    .where(eq(leads.source, 'csv_import'))

  // Per agent stats
  const proUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, 'pro'))

  const agentStats = await Promise.all(
    proUsers.map(async (agent) => {
      const agentLeads = await db
        .select({ stage: leads.stage, total: count(leads.id) })
        .from(leads)
        .where(eq(leads.assignedTo, agent.id))
        .groupBy(leads.stage)

      const total = agentLeads.reduce((s, l) => s + Number(l.total), 0)
      const paid = Number(agentLeads.find((l) => l.stage === 'paid')?.total ?? 0)
      const cancelled = Number(agentLeads.find((l) => l.stage === 'cancelled')?.total ?? 0)
      const active = total - paid - cancelled

      return { ...agent, total, paid, cancelled, active }
    })
  )

  const STAGE_ORDER = [
    { value: 'new_lead',         label: 'New Lead',       color: '#3b82f6' },
    { value: 'unresponsive',     label: 'Unresponsive',   color: '#6b7280' },
    { value: 'follow_up',        label: 'Follow Up',      color: '#eab308' },
    { value: 'docs_received',    label: 'Docs Received',  color: '#a855f7' },
    { value: 'options_sent',     label: 'Options Sent',   color: '#6366f1' },
    { value: 'final_decision',   label: 'Final Decision', color: '#f97316' },
    { value: 'walkin_booked',    label: 'Walk-in Booked', color: '#14b8a6' },
    { value: 'walkin_conducted', label: 'Walk-in Done',   color: '#06b6d4' },
    { value: 'cancelled',        label: 'Cancelled',      color: '#ef4444' },
    { value: 'paid',             label: 'Paid',           color: '#10b981' },
  ]

  const stageData = STAGE_ORDER.map((s) => ({
    ...s,
    count: Number(byStage.find((b) => b.stage === s.value)?.total ?? 0),
  }))

  const maxStageCount = Math.max(...stageData.map((s) => s.count), 1)
  const paidCount = Number(byStage.find((b) => b.stage === 'paid')?.total ?? 0)
  const cancelledCount = Number(byStage.find((b) => b.stage === 'cancelled')?.total ?? 0)
  const activeCount = totalLeads - paidCount - cancelledCount

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of all leads and performance</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Leads',    value: totalLeads,     color: 'text-white' },
          { label: 'Active',         value: activeCount,    color: 'text-blue-400' },
          { label: 'Paid',           value: paidCount,      color: 'text-emerald-400' },
          { label: 'Cancelled',      value: cancelledCount, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Leads by stage — horizontal bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-6">Leads by stage</h2>
          <div className="space-y-3">
            {stageData.map((stage) => (
              <div key={stage.value}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{stage.label}</span>
                  <span className="text-gray-500">{stage.count}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(stage.count / maxStageCount) * 100}%`,
                      backgroundColor: stage.color,
                      opacity: stage.count === 0 ? 0.2 : 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-6">Conversion funnel</h2>
          <div className="space-y-2">
            {[
              {
                label: 'Total imported',
                count: totalLeads,
                pct: 100,
                color: 'bg-blue-500',
              },
              {
                label: 'Contacted (follow up+)',
                count: stageData
                  .filter((s) =>
                    ['follow_up','docs_received','options_sent',
                     'final_decision','walkin_booked','walkin_conducted','paid']
                    .includes(s.value)
                  )
                  .reduce((s, x) => s + x.count, 0),
                pct: totalLeads > 0
                  ? Math.round(
                      (stageData
                        .filter((s) =>
                          ['follow_up','docs_received','options_sent',
                           'final_decision','walkin_booked','walkin_conducted','paid']
                          .includes(s.value)
                        )
                        .reduce((s, x) => s + x.count, 0) /
                        totalLeads) *
                        100
                    )
                  : 0,
                color: 'bg-purple-500',
              },
              {
                label: 'Walk-in booked',
                count:
                  (stageData.find((s) => s.value === 'walkin_booked')?.count ?? 0) +
                  (stageData.find((s) => s.value === 'walkin_conducted')?.count ?? 0) +
                  paidCount,
                pct:
                  totalLeads > 0
                    ? Math.round(
                        (((stageData.find((s) => s.value === 'walkin_booked')?.count ?? 0) +
                          (stageData.find((s) => s.value === 'walkin_conducted')?.count ?? 0) +
                          paidCount) /
                          totalLeads) *
                          100
                      )
                    : 0,
                color: 'bg-teal-500',
              },
              {
                label: 'Paid',
                count: paidCount,
                pct:
                  totalLeads > 0
                    ? Math.round((paidCount / totalLeads) * 100)
                    : 0,
                color: 'bg-emerald-500',
              },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{step.label}</span>
                  <span className="text-gray-500">
                    {step.count} ({step.pct}%)
                  </span>
                </div>
                <div className="h-6 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max(step.pct, step.count > 0 ? 4 : 0)}%` }}
                  >
                    {step.pct >= 10 && (
                      <span className="text-white text-xs font-medium">{step.pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent performance table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-medium">Agent performance</h2>
        </div>
        {agentStats.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600 text-sm">
            No agents yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-6 py-3">Agent</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Total Leads</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Active</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Paid</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Cancelled</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-semibold text-xs">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{agent.name}</p>
                        <p className="text-gray-500 text-xs">{agent.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{agent.total}</td>
                  <td className="px-6 py-4 text-blue-400">{agent.active}</td>
                  <td className="px-6 py-4 text-emerald-400">{agent.paid}</td>
                  <td className="px-6 py-4 text-red-400">{agent.cancelled}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width:
                              agent.total > 0
                                ? `${Math.round((agent.paid / agent.total) * 100)}%`
                                : '0%',
                          }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs w-8">
                        {agent.total > 0
                          ? `${Math.round((agent.paid / agent.total) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}