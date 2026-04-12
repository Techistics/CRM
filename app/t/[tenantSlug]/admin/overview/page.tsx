import { db } from '@/db'
import { leads, leadReminders, users, tenantMembers } from '@/db/schema'
import { eq, count, gte, isNull, and } from 'drizzle-orm'
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
        eq(tenantMembers.role, 'agent'),
      ),
    )

  const agentStats = await Promise.all(
    proUsers.map(async (agent) => {
      const agentLeads = await db
        .select({ stage: leads.stage, total: count(leads.id) })
        .from(leads)
        .where(
          and(tScope, eq(leads.assignedTo, agent.id)),
        )
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

  const paidCount = Number(byStage.find((b) => b.stage === 'paid')?.total ?? 0)
  const cancelledCount = Number(
    byStage.find((b) => b.stage === 'cancelled')?.total ?? 0
  )
  const activeCount = totalLeads - paidCount - cancelledCount

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
    />
  )
}