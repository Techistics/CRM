import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { requirePermissionSession } from '@/lib/tenant-server'
import { canViewAllAnalytics, toMemberScope } from '@/lib/member-scope'

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  try {
    const ctx = await requirePermissionSession('analytics.view')
    const viewAll = canViewAllAnalytics(toMemberScope(ctx))

    const { searchParams } = new URL(request.url)
    const counselorIdParam = searchParams.get('counselorId')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const counselorId = viewAll ? counselorIdParam : ctx.dbUserId

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

    const activityConditions = [eq(leadActivities.tenantId, ctx.tenant.id)]
    if (counselorId) {
      activityConditions.push(eq(leadActivities.userId, counselorId))
    }
    if (startDate) {
      activityConditions.push(gte(leadActivities.createdAt, startDate))
    }
    if (endDate) {
      activityConditions.push(lte(leadActivities.createdAt, endDate))
    }

    const results = await db
      .select({
        leadId: leads.id,
        leadName: leads.fullName,
        leadEmail: leads.email,
        stage: leads.stage,
        dateTouched: leadActivities.createdAt,
      })
      .from(leads)
      .innerJoin(
        leadActivities,
        and(eq(leads.id, leadActivities.leadId), ...activityConditions),
      )
      .where(eq(leads.tenantId, ctx.tenant.id))
      .orderBy(leadActivities.createdAt)

    const csvRows = ['ID,Name,Email,Stage,Date Touched']
    for (const r of results) {
      csvRows.push(
        [
          escapeCsv(r.leadId),
          escapeCsv(r.leadName),
          escapeCsv(r.leadEmail),
          escapeCsv(r.stage),
          escapeCsv(r.dateTouched ? r.dateTouched.toISOString() : ''),
        ].join(','),
      )
    }

    return new NextResponse(csvRows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=counselor_report.csv',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export report'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
