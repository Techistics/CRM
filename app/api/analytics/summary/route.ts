import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, tenantMembers, leads, tenantTimesheets, leadActivities } from '@/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET(request: Request) {
  const ctx = await requirePermissionApi('analytics.view')
  if (!ctx.ok) return ctx.response

  const { tenant, dbUserId, role } = ctx

    // Grab optional from and to query parameters from request URL
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

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

    const leadDateConditions = []
    if (startDate) {
      leadDateConditions.push(gte(leads.createdAt, startDate))
    }
    if (endDate) {
      leadDateConditions.push(lte(leads.createdAt, endDate))
    }

    const leadDateCondition = leadDateConditions.length > 0 ? and(...leadDateConditions) : undefined

    // Build main user stats query
    const whereConditions = [
      eq(tenantMembers.tenantId, tenant.id),
      eq(tenantMembers.role, 'PRO')
    ]
    if (role === 'PRO') {
      whereConditions.push(eq(users.id, dbUserId))
    }

    const userStats = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: tenantMembers.role,
        totalLeads: sql<number>`COUNT(${leads.id})::int`,
        activeLeads: sql<number>`COUNT(${leads.id}) FILTER (WHERE ${leads.lastContactedAt} >= NOW() - INTERVAL '4 days' AND ${leads.isDeadManual} = false)::int`,
        coldLeads: sql<number>`COUNT(${leads.id}) FILTER (WHERE (${leads.lastContactedAt} < NOW() - INTERVAL '4 days' OR ${leads.lastContactedAt} IS NULL) AND ${leads.isDeadManual} = false)::int`,
        deadLeads: sql<number>`COUNT(${leads.id}) FILTER (WHERE ${leads.isDeadManual} = true)::int`,
      })
      .from(users)
      .innerJoin(tenantMembers, eq(users.id, tenantMembers.userId))
      .leftJoin(
        leads,
        and(
          eq(leads.assignedTo, users.id),
          eq(leads.tenantId, tenant.id),
          leadDateCondition
        )
      )
      .where(and(...whereConditions))
      .groupBy(users.id, users.name, users.email, tenantMembers.role)

    // Query today's timesheet hours
    const timesheetWhere = [
      eq(tenantTimesheets.tenantId, tenant.id),
      eq(tenantTimesheets.date, sql`CURRENT_DATE`),
    ]
    if (role === 'PRO') {
      timesheetWhere.push(eq(tenantTimesheets.userId, dbUserId))
    }

    const timesheets = await db
  .select({
    userId: tenantTimesheets.userId,
    totalMinutes: sql<number>`
      SUM(
        CASE
          WHEN ${tenantTimesheets.punchOut} IS NOT NULL THEN COALESCE(${tenantTimesheets.totalMinutes}, 0)
          ELSE EXTRACT(EPOCH FROM (NOW() - ${tenantTimesheets.punchIn})) / 60
        END
      )::int
    `,
  })
  .from(tenantTimesheets)
  .where(and(...timesheetWhere))
  .groupBy(tenantTimesheets.userId)

    // Query today's edits count (lead activities today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const activitiesWhere = [
      eq(leadActivities.tenantId, tenant.id),
      gte(leadActivities.createdAt, todayStart),
    ]
    if (role === 'PRO') {
      activitiesWhere.push(eq(leadActivities.userId, dbUserId))
    }

    const edits = await db
      .select({
        userId: leadActivities.userId,
        editCount: sql<number>`COUNT(DISTINCT ${leadActivities.leadId})::int`,
      })
      .from(leadActivities)
      .where(and(...activitiesWhere))
      .groupBy(leadActivities.userId)

    // Merge everything in memory
    const timesheetMap = new Map<string, number>()
    for (const t of timesheets) {
      timesheetMap.set(t.userId, t.totalMinutes)
    }

    const editsMap = new Map<string, number>()
    for (const e of edits) {
      editsMap.set(e.userId, e.editCount)
    }

    const payload = userStats.map((u) => {
      const totalMinutes = timesheetMap.get(u.userId) || 0
      const todayHours = Number((totalMinutes / 60).toFixed(2))
      const todayEdits = editsMap.get(u.userId) || 0

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        role: u.role,
        totalLeads: u.totalLeads,
        activeLeads: u.activeLeads,
        coldLeads: u.coldLeads,
        deadLeads: u.deadLeads,
        todayHours,
        todayEdits,
      }
    })

    return NextResponse.json(payload)
}
