import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AnalyticsOverviewClient from './AnalyticsOverviewClient'

export default async function AdminOverviewPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Leads by stage
  const byStage = await db
    .select({ stage: leads.stage, total: count(leads.id) })
    .from(leads)
    .groupBy(leads.stage)

  // Total leads
  const totalLeads = byStage.reduce((sum, s) => sum + Number(s.total), 0)

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
      const cancelled = Number(
        agentLeads.find((l) => l.stage === 'cancelled')?.total ?? 0
      )
      const active = total - paid - cancelled

      return { ...agent, total, paid, cancelled, active }
    })
  )

  const STAGE_ORDER = [
    { value: 'new_lead', label: 'New Lead', color: '#3b82f6' },
    { value: 'unresponsive', label: 'Unresponsive', color: '#6b7280' },
    { value: 'follow_up', label: 'Follow Up', color: '#eab308' },
    { value: 'docs_received', label: 'Docs Received', color: '#a855f7' },
    { value: 'options_sent', label: 'Options Sent', color: '#6366f1' },
    {
      value: 'final_decision',
      label: 'Final Decision',
      color: '#f97316',
    },
    { value: 'walkin_booked', label: 'Walk-in Booked', color: '#14b8a6' },
    { value: 'walkin_conducted', label: 'Walk-in Done', color: '#06b6d4' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    { value: 'paid', label: 'Paid', color: '#10b981' },
  ] as const

  const stageData = STAGE_ORDER.map((s) => ({
    value: s.value,
    label: s.label,
    count: Number(byStage.find((b) => b.stage === s.value)?.total ?? 0),
    color: s.color,
  }))

  const paidCount = Number(byStage.find((b) => b.stage === 'paid')?.total ?? 0)
  const cancelledCount = Number(
    byStage.find((b) => b.stage === 'cancelled')?.total ?? 0
  )
  const activeCount = totalLeads - paidCount - cancelledCount

  const funnelSteps = [
    {
      label: 'Total imported',
      count: totalLeads,
      pct: 100,
      colorClass: 'bg-blue-500',
    },
    {
      label: 'Contacted (follow up+)',
      count: stageData
        .filter((s) =>
          [
            'follow_up',
            'docs_received',
            'options_sent',
            'final_decision',
            'walkin_booked',
            'walkin_conducted',
            'paid',
          ].includes(s.value)
        )
        .reduce((sum, s) => sum + s.count, 0),
      pct:
        totalLeads > 0
          ? Math.round(
              (stageData
                .filter((s) =>
                  [
                    'follow_up',
                    'docs_received',
                    'options_sent',
                    'final_decision',
                    'walkin_booked',
                    'walkin_conducted',
                    'paid',
                  ].includes(s.value)
                )
                .reduce((sum, s) => sum + s.count, 0) /
                totalLeads) *
                100
            )
          : 0,
      colorClass: 'bg-purple-500',
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
              (((stageData.find((s) => s.value === 'walkin_booked')?.count ??
                0) +
                (stageData.find(
                  (s) => s.value === 'walkin_conducted'
                )?.count ?? 0) +
                paidCount) /
                totalLeads) *
                100
            )
          : 0,
      colorClass: 'bg-teal-500',
    },
    {
      label: 'Paid',
      count: paidCount,
      pct: totalLeads > 0 ? Math.round((paidCount / totalLeads) * 100) : 0,
      colorClass: 'bg-emerald-500',
    },
  ]

  return (
    <AnalyticsOverviewClient
      totalLeads={totalLeads}
      activeCount={activeCount}
      paidCount={paidCount}
      cancelledCount={cancelledCount}
      stageData={stageData}
      funnelSteps={funnelSteps}
      agentStats={agentStats}
    />
  )
}