import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { leads, tenants, users, tenantMembers } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'

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

  // Build filters for the LEFT JOIN
  const leadFilters = [eq(leads.tenantId, tenant.id)]
  if (from) leadFilters.push(gte(leads.createdAt, new Date(from)))
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    leadFilters.push(lte(leads.createdAt, toDate))
  }

  const results = await db
    .select({
      agent_name: users.name,
      agent_email: users.email,
      total_assigned: sql<number>`count(${leads.id})`,
      won: sql<number>`count(${leads.id}) filter (where ${leads.stage} = 'paid')`,
      conversion_rate: sql<number>`round(count(${leads.id}) filter (where ${leads.stage} = 'paid')::numeric / nullif(count(${leads.id}), 0) * 100, 1)`,
      revenue: sql<number>`coalesce(sum(${leads.dealValue}) filter (where ${leads.stage} = 'paid'), 0)`,
    })
    .from(users)
    .leftJoin(leads, and(eq(leads.assignedTo, users.id), ...leadFilters))
    .where(
      inArray(
        users.id,
        db
          .select({ userId: tenantMembers.userId })
          .from(tenantMembers)
          .where(eq(tenantMembers.tenantId, tenant.id))
      )
    )
    .groupBy(users.id, users.name, users.email)
    .orderBy(sql`revenue DESC`)

  // Convert to CSV
  const headers = ['Agent Name', 'Agent Email', 'Leads Assigned', 'Leads Won', 'Conversion Rate %', 'Revenue']
  const csvRows = [
    headers.join(','),
    ...results.map((r) => [
      `"${r.agent_name}"`,
      `"${r.agent_email}"`,
      r.total_assigned,
      r.won,
      r.conversion_rate || 0,
      r.revenue,
    ].join(',')),
  ]

  const csv = csvRows.join('\n')
  const filename = `agent-report-${from || 'all'}-${to || 'now'}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
