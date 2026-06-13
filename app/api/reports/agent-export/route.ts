import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { leads, tenants, users, pipelineStages, pipelineSubStatuses } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { can } from '@/lib/authz'

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
  if (!access || !can(access.permissions, 'analytics.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all leads assigned to tenant members in date range
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
    .where(and(
      eq(leads.tenantId, tenant.id),
      ...(from ? [gte(leads.createdAt, new Date(from))] : []),
      ...(to ? [lte(leads.createdAt, (() => { const d = new Date(to); d.setHours(23,59,59,999); return d })())] : []),
    ))
    .orderBy(users.name, leads.createdAt)

  // Fetch stage labels
  const stageRows = await db
    .select({ key: pipelineStages.key, label: pipelineStages.label })
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant.id))
  const stageLabelMap = new Map(stageRows.map(s => [s.key, s.label]))

  // Fetch sub-status labels
  const subStatusRows = await db
    .select({ id: pipelineSubStatuses.id, label: pipelineSubStatuses.label })
    .from(pipelineSubStatuses)
    .where(eq(pipelineSubStatuses.tenantId, tenant.id))
  const subStatusLabelMap = new Map(subStatusRows.map(s => [s.id, s.label]))

  // Group by counsellor
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
    csvLines.push('') // blank line between counsellors
  }

  // Summary at end
  csvLines.push('')
  csvLines.push(`"Total Leads: ${leadRows.length}"`)
  const deadCount = leadRows.filter(r => r.isDead).length
  csvLines.push(`"Active: ${leadRows.length - deadCount}, Dead: ${deadCount}"`)

  const csv = csvLines.join('\n')
  const filename = `agent-report-${from || 'all'}-${to || 'now'}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
