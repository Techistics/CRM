import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, tenantTimesheets, leadActivities } from '@/db/schema'
import { eq, and, gte, lte, or, isNull, sql } from 'drizzle-orm'
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET(request: Request) {
  const ctx = await requirePermissionApi('analytics.view')
  if (!ctx.ok) return ctx.response

  const { tenant, dbUserId, role } = ctx

    // Grab URL parameters
    const { searchParams } = new URL(request.url)
    const counselorIdParam = searchParams.get('counselorId')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // If role is PRO, override parameter to use own dbUserId
    const targetUserId = role === 'PRO' ? dbUserId : (counselorIdParam || dbUserId)

    let startDate: Date | null = null
    let endDate: Date | null = null

    if (fromParam) {
      const d = new Date(fromParam)
      if (!isNaN(d.getTime())) {
        startDate = d
        startDate.setHours(0, 0, 0, 0)
      }
    }
    if (toParam) {
      const d = new Date(toParam)
      if (!isNaN(d.getTime())) {
        endDate = d
        endDate.setHours(23, 59, 59, 999)
      }
    }

    let timesheetStartDateStr: string | null = null
    let timesheetEndDateStr: string | null = null
    if (startDate) {
      timesheetStartDateStr = startDate.toISOString().split('T')[0]
    }
    if (endDate) {
      timesheetEndDateStr = endDate.toISOString().split('T')[0]
    }

    // 1. Earliest Punch In Today
    const [timesheetToday] = await db
      .select({
        punchIn: tenantTimesheets.punchIn,
      })
      .from(tenantTimesheets)
      .where(
        and(
          eq(tenantTimesheets.tenantId, tenant.id),
          eq(tenantTimesheets.userId, targetUserId),
          eq(tenantTimesheets.date, sql`CURRENT_DATE`)
        )
      )
      .orderBy(tenantTimesheets.punchIn)
      .limit(1)

    const punchInToday = timesheetToday?.punchIn ?? null

    // 2. Total Hours in Range
    const timesheetSumConditions = [
      eq(tenantTimesheets.tenantId, tenant.id),
      eq(tenantTimesheets.userId, targetUserId),
    ]
    if (timesheetStartDateStr) {
      timesheetSumConditions.push(gte(tenantTimesheets.date, timesheetStartDateStr))
    }
    if (timesheetEndDateStr) {
      timesheetSumConditions.push(lte(tenantTimesheets.date, timesheetEndDateStr))
    }

    const [totalHoursRow] = await db
      .select({
        totalMinutes: sql<number>`SUM(COALESCE(${tenantTimesheets.totalMinutes}, 0))::int`,
      })
      .from(tenantTimesheets)
      .where(and(...timesheetSumConditions))

    const totalMinutes = totalHoursRow?.totalMinutes ?? 0
    const totalHours = Number((totalMinutes / 60).toFixed(2))

    // 3. Lead Lists
    // Touched in Range
    const touchedToday = await db
      .selectDistinct({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        stage: leads.stage,
        primaryStage: leads.primaryStage,
        lastContactedAt: leads.lastContactedAt,
        isDeadManual: leads.isDeadManual,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(
        leadActivities,
        and(
          eq(leads.id, leadActivities.leadId),
          eq(leadActivities.userId, targetUserId),
          eq(leadActivities.tenantId, tenant.id),
          ...(startDate ? [gte(leadActivities.createdAt, startDate)] : []),
          ...(endDate ? [lte(leadActivities.createdAt, endDate)] : []),
        )
      )
      .where(eq(leads.tenantId, tenant.id))

    // Cold Leads
    const coldLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        stage: leads.stage,
        primaryStage: leads.primaryStage,
        lastContactedAt: leads.lastContactedAt,
        isDeadManual: leads.isDeadManual,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenant.id),
          eq(leads.assignedTo, targetUserId),
          eq(leads.isDeadManual, false),
          or(
            sql`${leads.lastContactedAt} < NOW() - INTERVAL '4 days'`,
            isNull(leads.lastContactedAt)
          )
        )
      )

    // Dead Leads
    const deadLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        stage: leads.stage,
        primaryStage: leads.primaryStage,
        lastContactedAt: leads.lastContactedAt,
        isDeadManual: leads.isDeadManual,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenant.id),
          eq(leads.assignedTo, targetUserId),
          eq(leads.isDeadManual, true)
        )
      )

    // Active Leads
    const activeLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        stage: leads.stage,
        primaryStage: leads.primaryStage,
        lastContactedAt: leads.lastContactedAt,
        isDeadManual: leads.isDeadManual,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenant.id),
          eq(leads.assignedTo, targetUserId),
          eq(leads.isDeadManual, false),
          gte(leads.lastContactedAt, sql`NOW() - INTERVAL '4 days'`)
        )
      )

    // 4. 30-Day Line Graph
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const graphData = await db
      .select({
        date: sql<string>`DATE(${leadActivities.createdAt})::text`,
        count: sql<number>`COUNT(${leadActivities.id})::int`,
      })
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.tenantId, tenant.id),
          eq(leadActivities.userId, targetUserId),
          gte(leadActivities.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${leadActivities.createdAt})`)
      .orderBy(sql`DATE(${leadActivities.createdAt})`)

    const dateMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dateMap.set(dateStr, 0)
    }

    for (const row of graphData) {
      if (row.date && dateMap.has(row.date)) {
        dateMap.set(row.date, row.count)
      }
    }

    const activityGraph = Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }))

    // 5. Lead Activities grouped by lead (logs vs other activities)
    const activityRows = await db
      .select({
        leadId: leadActivities.leadId,
        type: leadActivities.type,
        note: leadActivities.note,
        createdAt: leadActivities.createdAt,
      })
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.tenantId, tenant.id),
          eq(leadActivities.userId, targetUserId),
          ...(startDate ? [gte(leadActivities.createdAt, startDate)] : []),
          ...(endDate ? [lte(leadActivities.createdAt, endDate)] : []),
        ),
      )

    const leadActivitiesByLead = activityRows.reduce((acc, row) => {
      const group = acc[row.leadId] ?? { leadId: row.leadId, logs: [], otherActivities: [] }
      if (row.type === 'note' || row.type === 'stage_change') {
        group.logs.push({ type: row.type, note: row.note, createdAt: row.createdAt })
      } else {
        group.otherActivities.push({ type: row.type, note: row.note, createdAt: row.createdAt })
      }
      acc[row.leadId] = group
      return acc
    }, {} as Record<string, { leadId: string; logs: any[]; otherActivities: any[] }>)
    const leadActivitiesArray = Object.values(leadActivitiesByLead)

    const payload = {
      punchInToday,
      totalHours,
      leads: {
        touchedToday,
        cold: coldLeads,
        dead: deadLeads,
        active: activeLeads,
      },
      activityGraph,
      leadActivities: leadActivitiesArray,
    }

    return NextResponse.json(payload)
}
