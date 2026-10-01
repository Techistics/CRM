import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, tenantMembers, leads, tenantTimesheets, leadActivities, leadRevenues } from '@/db/schema'
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm'
import { requirePermissionApi } from '@/lib/tenant-api'
import { canViewAllAnalytics, toMemberScope } from '@/lib/member-scope'

export async function GET(request: Request) {
  const ctx = await requirePermissionApi('analytics.view')
  if (!ctx.ok) return ctx.response

  const { tenant, dbUserId } = ctx
  const scope = toMemberScope({ ...ctx, permissions: ctx.permissions ?? [] })
  const viewAll = canViewAllAnalytics(scope)

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
      eq(tenantMembers.role, 'PRO'),
      isNull(tenantMembers.deletedAt),
    ]
    if (!viewAll) {
      whereConditions.push(eq(users.id, dbUserId))
    }

    const userStats = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: tenantMembers.role,
        totalLeads: sql<number>`COUNT(${leads.id})::int`,
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
    if (!viewAll) {
      timesheetWhere.push(eq(tenantTimesheets.userId, dbUserId))
    }

    const timesheets = await db
  .select({
    userId: tenantTimesheets.userId,
    earliestPunchIn: sql<string | null>`MIN(${tenantTimesheets.punchIn})::text`,
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

    // Query edits count in the selected duration
    const activitiesWhere = [
      eq(leadActivities.tenantId, tenant.id),
    ]
    if (startDate) {
      activitiesWhere.push(gte(leadActivities.createdAt, startDate))
    }
    if (endDate) {
      activitiesWhere.push(lte(leadActivities.createdAt, endDate))
    }
    
    if (!viewAll) {
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
    const earliestPunchInMap = new Map<string, string | null>()
    for (const t of timesheets) {
      timesheetMap.set(t.userId, t.totalMinutes)
      earliestPunchInMap.set(t.userId, t.earliestPunchIn)
    }

    const editsMap = new Map<string, number>()
    for (const e of edits) {
      editsMap.set(e.userId, e.editCount)
    }

    const payload = userStats.map((u) => {
      const totalMinutes = timesheetMap.get(u.userId) || 0
      const todayHours = Number((totalMinutes / 60).toFixed(2))
      const periodEdits = editsMap.get(u.userId) || 0
      const earliestPunchIn = earliestPunchInMap.get(u.userId) || null

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        role: u.role,
        totalLeads: u.totalLeads,

        todayHours,
        periodEdits,
        earliestPunchIn,
      }
    })

    // Get all revenues within the period
    const revenuesWhere = [
      eq(leadRevenues.tenantId, tenant.id),
    ]
    if (startDate) {
      revenuesWhere.push(gte(leadRevenues.createdAt, startDate))
    }
    if (endDate) {
      revenuesWhere.push(lte(leadRevenues.createdAt, endDate))
    }
    if (!viewAll) {
      // For revenues, we match by the lead's assigned counselor, but leadRevenues has createdBy.
      // Wait, let's just filter by createdBy for now or join leads.
      revenuesWhere.push(eq(leadRevenues.createdBy, dbUserId))
    }

    const revenuesData = await db
      .select({
        counselorId: leadRevenues.createdBy,
        counselorFee: leadRevenues.counselorFee,
        universityFee: leadRevenues.universityFee,
        country: leadRevenues.country,
        intakeYear: leadRevenues.intakeYear,
        intakeMonth: leadRevenues.intakeMonth,
      })
      .from(leadRevenues)
      .where(and(...revenuesWhere))

    const revenueByCountry: Record<string, number> = {}
    const revenueByCounselor: Record<string, number> = {}
    const revenueByIntakeYear: Record<string, number> = {}
    const studentCountPerCounselorIntake: Record<string, number> = {}

    for (const rev of revenuesData) {
      const cFee = Number(rev.counselorFee || 0)
      const uFee = Number(rev.universityFee || 0)
      const totalRev = cFee + uFee

      const country = rev.country || 'Unknown'
      revenueByCountry[country] = (revenueByCountry[country] || 0) + totalRev

      const counselor = rev.counselorId || 'Unknown'
      revenueByCounselor[counselor] = (revenueByCounselor[counselor] || 0) + totalRev

      const year = rev.intakeYear ? String(rev.intakeYear) : 'Unknown'
      revenueByIntakeYear[year] = (revenueByIntakeYear[year] || 0) + totalRev

      const intakeKey = `${counselor}_${year}_${rev.intakeMonth || 'All'}`
      studentCountPerCounselorIntake[intakeKey] = (studentCountPerCounselorIntake[intakeKey] || 0) + 1
    }

    return NextResponse.json({
      summary: payload,
      revenueByCountry,
      revenueByCounselor,
      revenueByIntakeYear,
      studentCountPerCounselorIntake
    })
}
