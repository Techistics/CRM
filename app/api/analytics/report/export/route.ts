import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { requirePermissionSession } from '@/lib/tenant-server'
import { canViewAllAnalytics, toMemberScope } from '@/lib/member-scope'
import { getStageInfo } from '@/constants/pipeline-stages'

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
        displayId: leads.displayId,
        leadName: leads.fullName,
        leadEmail: leads.email,
        stage: leads.stage,
        dateTouched: leadActivities.createdAt,
        type: leadActivities.type,
        note: leadActivities.note,
      })
      .from(leads)
      .innerJoin(
        leadActivities,
        and(eq(leads.id, leadActivities.leadId), ...activityConditions),
      )
      .where(eq(leads.tenantId, ctx.tenant.id))
      .orderBy(desc(leadActivities.createdAt))

    // Group by lead ID to get only the latest activity per lead
    const latestPerLead = new Map<string, typeof results[number]>()
    for (const r of results) {
      if (!latestPerLead.has(r.leadId)) {
        latestPerLead.set(r.leadId, r)
      }
    }
    const finalLeads = Array.from(latestPerLead.values())

    const csvRows = ['Lead ID,Name,Email,Stage,Last Touched Date,Action Type,Latest Note']
    for (const r of finalLeads) {
      const stageName = getStageInfo(r.stage).label
      csvRows.push(
        [
          escapeCsv(r.displayId ?? r.leadId.slice(0, 6).toUpperCase()),
          escapeCsv(r.leadName),
          escapeCsv(r.leadEmail),
          escapeCsv(stageName),
          escapeCsv(r.dateTouched ? new Date(r.dateTouched).toISOString() : ''),
          escapeCsv(r.type),
          escapeCsv(r.note),
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
