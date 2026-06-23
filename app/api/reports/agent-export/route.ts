import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { leads, tenants, users, pipelineStages, pipelineSubStatuses } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { can } from '@/lib/authz'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { toMemberScope } from '@/lib/member-scope'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const tenantSlug = searchParams.get('tenantSlug')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50))
  const offset = (page - 1) * pageSize

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 })
  }

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
  if (!access || !can(access.permissions, 'analytics.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dateFilters = [
    leadsVisibleWhere(tenant.id, toMemberScope({ role: access.role, dbUserId: session.userId, customRoleId: access.customRoleId })),
    eq(leads.tenantId, tenant.id),
  ]
  if (from) dateFilters.push(gte(leads.createdAt, new Date(from)))
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    dateFilters.push(lte(leads.createdAt, toDate))
  }

  const leadRows = await db
    .select({
      counsellorName: users.name,
      counsellorEmail: users.email,
      leadId: leads.id,
      fullName: leads.fullName,
      lastContactedAt: leads.lastContactedAt,
      stage: leads.primaryStage,
      subStatusId: leads.subStatusId,
      closedAction: leads.closedAction,
      isDead: leads.isDeadManual,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(users, eq(leads.assignedTo, users.id))
    .where(and(...dateFilters))
    .orderBy(users.name, leads.createdAt)
    .limit(pageSize)
    .offset(offset)

  const stageRows = await db
    .select({ key: pipelineStages.key, label: pipelineStages.label })
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant.id))
  const stageLabelMap = new Map(stageRows.map((s) => [s.key, s.label]))

  const subStatusRows = await db
    .select({ id: pipelineSubStatuses.id, label: pipelineSubStatuses.label })
    .from(pipelineSubStatuses)
    .where(eq(pipelineSubStatuses.tenantId, tenant.id))
  const subStatusLabelMap = new Map(subStatusRows.map((s) => [s.id, s.label]))

  const grouped = new Map<string, typeof leadRows>()
  for (const row of leadRows) {
    const key = row.counsellorEmail ?? 'unknown'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const csvLines: string[] = []
  for (const [, rows] of grouped) {
    const first = rows[0]
    csvLines.push(`"Counsellor: ${first.counsellorName} <${first.counsellorEmail}>"`)
    csvLines.push(['Lead ID', 'Name', 'Last Contacted', 'Stage', 'Sub Status', 'Closed Action', 'Status'].join(','))
    for (const r of rows) {
      csvLines.push([
        `"${r.leadId}"`,
        `"${String(r.fullName).replace(/"/g, '""')}"`,
        r.lastContactedAt ? new Date(r.lastContactedAt).toLocaleDateString() : 'Never',
        `"${stageLabelMap.get(String(r.stage)) ?? r.stage}"`,
        `"${r.subStatusId ? (subStatusLabelMap.get(r.subStatusId) ?? '') : ''}"`,
        `"${r.closedAction ?? ''}"`,
        r.isDead ? 'Dead' : 'Active',
      ].join(','))
    }
    csvLines.push('')
  }

  csvLines.push('')
  csvLines.push(`"Page: ${page}, Page size: ${pageSize}, Rows on page: ${leadRows.length}"`)
  const deadCount = leadRows.filter((r) => r.isDead).length
  csvLines.push(`"Active on page: ${leadRows.length - deadCount}, Dead on page: ${deadCount}"`)

  const csv = csvLines.join('\n')
  const filename = `agent-report-${from || 'all'}-${to || 'now'}-p${page}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Page': String(page),
      'X-Page-Size': String(pageSize),
      'X-Row-Count': String(leadRows.length),
    },
  })
}
