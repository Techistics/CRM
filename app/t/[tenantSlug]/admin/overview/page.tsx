import { db } from '@/db'
import { leads, leadReminders, users, tenantMembers } from '@/db/schema'
import { eq, count, gte, isNull, and, sql } from 'drizzle-orm'
import AnalyticsOverviewClient from './AnalyticsOverviewClient'
import { loadChartSnapshotsByWindow } from '@/lib/analytics-pipeline'
import { reconcileOverdueRemindersForTenant } from '@/lib/lead-reminders-sync'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function AdminOverviewPage() {
  const { tenant } = await requireTenantAdminSession()
  const tScope = eq(leads.tenantId, tenant.id)

  await reconcileOverdueRemindersForTenant(tenant.id)

  const [overdueRemindersRow] = await db
    .select({ c: count(leadReminders.id) })
    .from(leadReminders)
    .where(
      and(
        eq(leadReminders.tenantId, tenant.id),
        eq(leadReminders.status, 'overdue'),
      ),
    )
  const overdueRemindersCount = Number(overdueRemindersRow?.c ?? 0)

  // Leads by stage
  const byStage = await db
    .select({ stage: leads.stage, total: count(leads.id) })
    .from(leads)
    .where(tScope)
    .groupBy(leads.stage)

  // Total leads
  const totalLeads = byStage.reduce((sum, s) => sum + Number(s.total), 0)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [newLeadsTodayRow] = await db
    .select({ c: count(leads.id) })
    .from(leads)
    .where(and(tScope, gte(leads.createdAt, startOfToday)))

  const [unassignedRow] = await db
    .select({ c: count(leads.id) })
    .from(leads)
    .where(and(tScope, isNull(leads.assignedTo)))

  const newLeadsToday = Number(newLeadsTodayRow?.c ?? 0)
  const unassignedCount = Number(unassignedRow?.c ?? 0)

  // Per agent stats
  const proUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(
      and(
        eq(tenantMembers.tenantId, tenant.id),
        eq(tenantMembers.role, 'PRO'),
      ),
    )

  // Grouped Query for Agent Stats (Efficiency)
  const agentStatsRaw = await db
    .select({
      assignedTo: leads.assignedTo,
      total: sql<number>`COUNT(*)::int`,
      paid: sql<number>`COUNT(*) FILTER (WHERE ${leads.stage} = 'paid')::int`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${leads.stage} = 'cancelled')::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${leads.stage} NOT IN ('paid', 'cancelled'))::int`,
      totalValue: sql<number>`COALESCE(SUM(${leads.dealValue}), 0)::int`,
    })
    .from(leads)
    .where(tScope)
    .groupBy(leads.assignedTo)

  const agentStats = proUsers.map(agent => {
    const stats = agentStatsRaw.find(s => s.assignedTo === agent.id)
    return {
      ...agent,
      total: stats?.total ?? 0,
      paid: stats?.paid ?? 0,
      cancelled: stats?.cancelled ?? 0,
      active: stats?.active ?? 0,
      totalValue: stats?.totalValue ?? 0,
    }
  })

  // Value aggregates
  const [valueAggs] = await db
    .select({
      pipelineValue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.stage} NOT IN ('paid', 'cancelled')), 0)::int`,
      wonRevenue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.stage} = 'paid'), 0)::int`,
    })
    .from(leads)
    .where(tScope)

  const paidCount = Number(byStage.find((b) => b.stage === 'paid')?.total ?? 0)
  const cancelledCount = Number(
    byStage.find((b) => b.stage === 'cancelled')?.total ?? 0
  )
  const activeCount = totalLeads - paidCount - cancelledCount

  const conversionRate = totalLeads > 0 
    ? Math.round((paidCount / totalLeads) * 100) 
    : 0

  const chartByWindow = await loadChartSnapshotsByWindow(tenant.id)

  return (
    <AnalyticsOverviewClient
      tenantSlug={tenant.slug}
      chartByWindow={chartByWindow}
      overdueRemindersCount={overdueRemindersCount}
      totalLeads={totalLeads}
      activeCount={activeCount}
      paidCount={paidCount}
      cancelledCount={cancelledCount}
      newLeadsToday={newLeadsToday}
      unassignedCount={unassignedCount}
      agentStats={agentStats}
      pipelineValue={Number(valueAggs?.pipelineValue ?? 0)}
      wonRevenue={Number(valueAggs?.wonRevenue ?? 0)}
      conversionRate={conversionRate}
    />
  )
}