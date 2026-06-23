import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { leads, tenants, pipelineStages, users, pipelineSubStatuses } from '@/db/schema'
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

  const filters = [
    leadsVisibleWhere(tenant.id, toMemberScope({ role: access.role, dbUserId: session.userId, customRoleId: access.customRoleId })),
    eq(leads.tenantId, tenant.id),
  ]
  if (from) filters.push(gte(leads.createdAt, new Date(from)))
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    filters.push(lte(leads.createdAt, toDate))
  }

  const leadRows = await db
    .select({
      leadId: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      stage: leads.primaryStage,
      subStatusId: leads.subStatusId,
      closedAction: leads.closedAction,
      lastContactedAt: leads.lastContactedAt,
      isDead: leads.isDeadManual,
      assignedToId: leads.assignedTo,
      assignedToName: users.name,
      createdAt: leads.createdAt,
      city: leads.city,
      country: leads.country,
      intakeMonth: leads.intakeMonth,
      destinationCountry: leads.destinationCountry,
      programOfInterest: leads.programOfInterest,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(...filters))
    .orderBy(leads.primaryStage, leads.createdAt)
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

  const stageGroups = new Map<string, typeof leadRows>()
  for (const row of leadRows) {
    const key = String(row.stage)
    if (!stageGroups.has(key)) stageGroups.set(key, [])
    stageGroups.get(key)!.push(row)
  }

  const csvLines: string[] = []
  csvLines.push('"PIPELINE REPORT SUMMARY"')
  csvLines.push(`"Page: ${page}, Page size: ${pageSize}, Rows on page: ${leadRows.length}"`)
  csvLines.push(['Stage', 'Total Leads', 'Active', 'Dead'].join(','))
  for (const [stageKey, rows] of stageGroups) {
    const dead = rows.filter((r) => r.isDead).length
    csvLines.push([
      `"${stageLabelMap.get(stageKey) ?? stageKey}"`,
      rows.length,
      rows.length - dead,
      dead,
    ].join(','))
  }
  csvLines.push('')

  const headers = ['Lead ID','Name','Email','Phone','City','Country','Intake','Destination','Program','Sub Status','Closed Action','Assigned To','Last Contacted','Status','Created']
  for (const [stageKey, rows] of stageGroups) {
    csvLines.push(`"Stage: ${stageLabelMap.get(stageKey) ?? stageKey}"`)
    csvLines.push(headers.join(','))
    for (const r of rows) {
      csvLines.push([
        `"${r.leadId}"`,
        `"${String(r.fullName).replace(/"/g, '""')}"`,
        `"${r.email ?? ''}"`,
        `"${r.contactNumber ?? ''}"`,
        `"${r.city ?? ''}"`,
        `"${r.country ?? ''}"`,
        `"${r.intakeMonth ?? ''}"`,
        `"${r.destinationCountry ?? ''}"`,
        `"${r.programOfInterest ?? ''}"`,
        `"${r.subStatusId ? (subStatusLabelMap.get(r.subStatusId) ?? '') : ''}"`,
        `"${r.closedAction ?? ''}"`,
        `"${r.assignedToName ?? 'Unassigned'}"`,
        r.lastContactedAt ? new Date(r.lastContactedAt).toLocaleDateString() : 'Never',
        r.isDead ? 'Dead' : 'Active',
        new Date(r.createdAt!).toLocaleDateString(),
      ].join(','))
    }
    csvLines.push('')
  }

  const csv = csvLines.join('\n')
  const filename = `pipeline-report-${from || 'all'}-${to || 'now'}-p${page}.csv`

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
