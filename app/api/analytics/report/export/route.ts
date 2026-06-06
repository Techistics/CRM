import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  try {
    const { tenant, role } = await requireTenantSession()

    // 1. Role Check
    if (role === 'PRO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Extract query parameters
    const { searchParams } = new URL(request.url)
    const counselorId = searchParams.get('counselorId')
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

    // 3. Build query conditions
    const activityConditions = [
      eq(leadActivities.tenantId, tenant.id)
    ]
    if (counselorId) {
      activityConditions.push(eq(leadActivities.userId, counselorId))
    }
    if (startDate) {
      activityConditions.push(gte(leadActivities.createdAt, startDate))
    }
    if (endDate) {
      activityConditions.push(lte(leadActivities.createdAt, endDate))
    }

    // Query leads records touched by counselor in range
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
        and(
          eq(leads.id, leadActivities.leadId),
          ...activityConditions
        )
      )
      .where(eq(leads.tenantId, tenant.id))
      .orderBy(leadActivities.createdAt)

    // Assemble CSV
    const csvRows = ['ID,Name,Email,Stage,Date Touched']
    for (const r of results) {
      const id = escapeCsv(r.leadId)
      const name = escapeCsv(r.leadName)
      const email = escapeCsv(r.leadEmail)
      const stage = escapeCsv(r.stage)
      const dateTouched = escapeCsv(r.dateTouched ? r.dateTouched.toISOString() : '')
      csvRows.push(`${id},${name},${email},${stage},${dateTouched}`)
    }

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=counselor_report.csv',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export report' },
      { status: 500 }
    )
  }
}
