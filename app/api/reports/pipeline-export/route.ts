import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { leads, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const tenantSlug = searchParams.get('tenantSlug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 })
  }

  // Auth check
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1)

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const access = await resolveTenantAccess(session.userId, tenant)
  if (!access || access.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Build query
  const filters = [eq(leads.tenantId, tenant.id)]
  if (from) filters.push(gte(leads.createdAt, new Date(from)))
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    filters.push(lte(leads.createdAt, toDate))
  }

  const stageOrder = PIPELINE_STAGES.map((s, i) => `WHEN '${s.value}' THEN ${i + 1}`).join(' ')

  const results = await db
    .select({
      stage: leads.stage,
      lead_count: sql<number>`count(*)`,
      total_value: sql<number>`coalesce(sum(${leads.dealValue}), 0)`,
      avg_value: sql<number>`coalesce(avg(${leads.dealValue}), 0)`,
      leads_with_value: sql<number>`count(*) filter (where ${leads.dealValue} is not null)`,
    })
    .from(leads)
    .where(and(...filters))
    .groupBy(leads.stage)
    .orderBy(sql`CASE stage ${sql.raw(stageOrder)} ELSE ${PIPELINE_STAGES.length + 1} END`)

  // Convert to CSV
  const headers = ['Stage', 'Lead Count', 'Total Deal Value', 'Avg Deal Value', 'Leads With Value']
  const csvRows = [
    headers.join(','),
    ...results.map((r) => {
      const stageLabel = PIPELINE_STAGES.find((s) => s.value === r.stage)?.label || r.stage
      return [
        `"${stageLabel}"`,
        r.lead_count,
        r.total_value,
        r.avg_value,
        r.leads_with_value,
      ].join(',')
    }),
  ]

  const csv = csvRows.join('\n')
  const filename = `pipeline-report-${from || 'all'}-${to || 'now'}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
