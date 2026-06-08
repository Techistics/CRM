import { db } from '@/db'
import { leads, leadReminders, users, tenantMembers } from '@/db/schema'
import { eq, count, gte, lte, isNull, and, sql } from 'drizzle-orm'
import AnalyticsOverviewClient from './AnalyticsOverviewClient'
import { loadChartSnapshotsByWindow } from '@/lib/analytics-pipeline'
import { reconcileOverdueRemindersForTenant } from '@/lib/lead-reminders-sync'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { tenant } = await requireTenantAdminSession()
  const { from, to } = await searchParams

  let startDate: Date | null = null
  let endDate: Date | null = null

  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) {
      startDate = d
      startDate.setHours(0, 0, 0, 0)
    }
  }
  if (to) {
    const d = new Date(to)
    if (!isNaN(d.getTime())) {
      endDate = d
      endDate.setHours(23, 59, 59, 999)
    }
  }

  // If both are missing (initial load), default to This Month
  if (from === undefined && to === undefined) {
    startDate = new Date()
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
    
    endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
  }

  const dateCondition = startDate && endDate
    ? and(gte(leads.createdAt, startDate), lte(leads.createdAt, endDate))
    : startDate
    ? gte(leads.createdAt, startDate)
    : endDate
    ? lte(leads.createdAt, endDate)
    : undefined

  const tScope = and(
    eq(leads.tenantId, tenant.id),
    dateCondition
  )

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
    .select({ stage: leads.primaryStage, total: count(leads.id) })
    .from(leads)
    .where(tScope)
    .groupBy(leads.primaryStage)

  // Total leads
  const totalLeads = byStage.reduce((sum, s) => sum + Number(s.total), 0)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [newLeadsTodayRow] = await db
    .select({ c: count(leads.id) })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), gte(leads.createdAt, startOfToday)))

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
      paid: sql<number>`COUNT(*) FILTER (WHERE ${leads.primaryStage} = 'paid')::int`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${leads.primaryStage} = 'cancelled')::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${leads.primaryStage} NOT IN ('paid', 'cancelled'))::int`,
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
      pipelineValue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.primaryStage} NOT IN ('paid', 'cancelled')), 0)::int`,
      wonRevenue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.primaryStage} = 'paid'), 0)::int`,
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

  const teamPerformance = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      COUNT(l.id) as total_leads,
      COUNT(l.id) FILTER (WHERE l.primary_stage = 'paid') as won,
      COUNT(l.id) FILTER (
        WHERE l.last_contacted_at < NOW() - INTERVAL '3 days'
        OR (l.last_contacted_at IS NULL 
            AND l.created_at < NOW() - INTERVAL '3 days')
      ) as cold_leads,
      COUNT(l.id) FILTER (
        WHERE l.last_contacted_at < NOW() - INTERVAL '7 days'
        OR (l.last_contacted_at IS NULL 
            AND l.created_at < NOW() - INTERVAL '7 days')
      ) as dead_leads,
      ROUND(
        COUNT(l.id) FILTER (WHERE l.primary_stage = 'paid')::numeric 
        / NULLIF(COUNT(l.id), 0) * 100, 1
      ) as conversion_rate,
      MAX(l.last_contacted_at) as last_activity
    FROM users u
    INNER JOIN tenant_members tm ON tm.user_id = u.id 
      AND tm.tenant_id = ${tenant.id}
    LEFT JOIN leads l ON l.assigned_to = u.id 
      AND l.tenant_id = ${tenant.id}
      AND l.primary_stage NOT IN ('paid', 'cancelled')
    GROUP BY u.id, u.name, u.email
    ORDER BY dead_leads DESC, cold_leads DESC
  `)

  // Daily sparkline data — last 7 days per KPI
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const sparklineRaw = await db.execute(sql`
    SELECT 
      DATE(created_at) as day,
      COUNT(*) FILTER (WHERE tenant_id = ${tenant.id}) as total,
      COUNT(*) FILTER (WHERE tenant_id = ${tenant.id} AND assigned_to IS NULL) as unassigned,
      COALESCE(SUM(deal_value) FILTER (WHERE tenant_id = ${tenant.id} AND primary_stage = 'paid'), 0) as revenue
    FROM leads
    WHERE tenant_id = ${tenant.id}
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `)

  const sparkRows = (sparklineRaw.rows ?? []) as Array<{ day: string; total: number; unassigned: number; revenue: number }>

  const buildSpark = (key: 'total' | 'unassigned' | 'revenue') =>
    last7Days.map((d) => {
      const dateStr = d.toISOString().split('T')[0]
      const row = sparkRows.find((r) => String(r.day).startsWith(dateStr))
      return Number(row?.[key] ?? 0)
    })

  // Previous 30 days comparison
  const prev30Start = new Date()
  prev30Start.setDate(prev30Start.getDate() - 60)
  prev30Start.setHours(0, 0, 0, 0)
  const prev30End = new Date()
  prev30End.setDate(prev30End.getDate() - 30)
  prev30End.setHours(23, 59, 59, 999)

  const curr30Start = new Date()
  curr30Start.setDate(curr30Start.getDate() - 30)
  curr30Start.setHours(0, 0, 0, 0)

  const [prevPeriodStats] = await db
    .select({
      totalLeads: sql<number>`COUNT(*)::int`,
      newLeads: sql<number>`COUNT(*)::int`,
      wonRevenue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.primaryStage} = 'paid'), 0)::int`,
      unassigned: sql<number>`COUNT(*) FILTER (WHERE ${leads.assignedTo} IS NULL)::int`,
    })
    .from(leads)
    .where(and(
      eq(leads.tenantId, tenant.id),
      gte(leads.createdAt, prev30Start),
      lte(leads.createdAt, prev30End),
    ))

  const [currPeriodStats] = await db
    .select({
      totalLeads: sql<number>`COUNT(*)::int`,
      wonRevenue: sql<number>`COALESCE(SUM(${leads.dealValue}) FILTER (WHERE ${leads.primaryStage} = 'paid'), 0)::int`,
      unassigned: sql<number>`COUNT(*) FILTER (WHERE ${leads.assignedTo} IS NULL)::int`,
    })
    .from(leads)
    .where(and(
      eq(leads.tenantId, tenant.id),
      gte(leads.createdAt, curr30Start),
    ))

  const calcTrend = (curr: number, prev: number): { value: string; positive: boolean } => {
    if (prev === 0) return curr > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true }
    const pct = Math.round(((curr - prev) / prev) * 100)
    return { value: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
  }

  const trends = {
    totalLeads: calcTrend(Number(currPeriodStats?.totalLeads ?? 0), Number(prevPeriodStats?.totalLeads ?? 0)),
    newToday: calcTrend(newLeadsToday, Math.round(Number(prevPeriodStats?.newLeads ?? 0) / 30)),
    wonRevenue: calcTrend(Number(currPeriodStats?.wonRevenue ?? 0), Number(prevPeriodStats?.wonRevenue ?? 0)),
    unassigned: calcTrend(Number(currPeriodStats?.unassigned ?? 0), Number(prevPeriodStats?.unassigned ?? 0)),
  }

  const sparklines = {
    totalLeads: buildSpark('total'),
    newToday: last7Days.map((d) => {
      const dateStr = d.toISOString().split('T')[0]
      const row = sparkRows.find((r) => String(r.day).startsWith(dateStr))
      return Number(row?.total ?? 0)
    }),
    wonRevenue: buildSpark('revenue'),
    unassigned: buildSpark('unassigned'),
  }

  const chartByWindow = await loadChartSnapshotsByWindow(tenant.id)

  return (
    <AnalyticsOverviewClient
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
      teamPerformance={
        (teamPerformance.rows ?? []) as Array<{
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
      }
      sparklines={sparklines}
      trends={trends}
      dateRange={{ from: startDate, to: endDate }}
    />
  )
}
