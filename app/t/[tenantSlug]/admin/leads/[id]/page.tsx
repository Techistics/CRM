import { db } from '@/db'
import { leadActivities, consultantLogs, users, tenantMembers, leadTags, leadTagAssignments, leadStageAssignments } from '@/db/schema'
import { eq, desc, and, isNull, aliasedTable } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'
import { requirePermissionSession } from '@/lib/tenant-server'
import { canMovePipelineBackward } from '@/lib/authz'
import { getLeadInTenant } from '@/lib/lead-tenant'
import type { ActivityRow } from '@/types/leads'
import { getTenantPipeline } from '@/lib/pipeline/config'

/** Reads `campaign_name` off a lead's raw_data JSONB (Meta imports store it there). */
function readRawCampaignName(rawData: unknown): string | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null
  const value = (rawData as Record<string, unknown>).campaign_name
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant, permissions } = await requirePermissionSession('leads.view')
  const { id } = await params

  const lead = await getLeadInTenant(id, tenant.id)
  if (!lead) notFound()

  const pipeline = await getTenantPipeline(tenant.id)
  const stageLabels = Object.fromEntries(pipeline.stages.map((s) => [s.key, s.label]))

  // Campaign name: the CSV import batch value wins (unchanged for CSV leads).
  // Falls back to raw_data.campaign_name when the lead has no csv_import_id
  // (Meta leads) or the batch row is missing.
  let campaignName: string | null = null
  if (lead.csvImportId) {
    const importBatch = await db.query.csvImports.findFirst({
      where: (csvImports, { eq }) => eq(csvImports.id, lead.csvImportId!),
      columns: { campaignName: true },
    })
    campaignName = importBatch?.campaignName ?? null
  }
  if (!campaignName) {
    campaignName = readRawCampaignName(lead.rawData)
  }

  const activities = await db
    .select({
      id: leadActivities.id,
      type: leadActivities.type,
      fromStage: leadActivities.fromStage,
      toStage: leadActivities.toStage,
      note: leadActivities.note,
      createdAt: leadActivities.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(leadActivities)
    .leftJoin(users, eq(leadActivities.userId, users.id))
    .where(
      and(
        eq(leadActivities.leadId, id),
        eq(leadActivities.tenantId, tenant.id),
      ),
    )
    .orderBy(desc(leadActivities.createdAt))

  // Also fetch historical consultant_logs not yet mirrored into leadActivities
  const logUsers = aliasedTable(users, 'log_users')
  const rawLogs = await db
    .select({
      id: consultantLogs.id,
      type: consultantLogs.type,
      note: consultantLogs.body,
      createdAt: consultantLogs.createdAt,
      userName: logUsers.name,
      userEmail: logUsers.email,
    })
    .from(consultantLogs)
    .leftJoin(logUsers, eq(consultantLogs.userId, logUsers.id))
    .where(
      and(
        eq(consultantLogs.leadId, id),
        eq(consultantLogs.tenantId, tenant.id),
      ),
    )
    .orderBy(desc(consultantLogs.createdAt))

  const logs = rawLogs.map((l) => ({
    ...l,
    fromStage: null as string | null,
    toStage: null as string | null,
    createdAt: l.createdAt ?? null,
  }))

  // Merge and de-duplicate by note + createdAt minute
  const activityKeys = new Set(
    activities
      .filter((a) => a.note && a.createdAt)
      .map((a) => `${a.note?.slice(0, 40)}|${new Date(a.createdAt!).toISOString().slice(0, 16)}`)
  )
  const uniqueLogs = logs.filter((l) => {
    if (!l.createdAt) return true
    const key = `${l.note?.slice(0, 40)}|${new Date(l.createdAt).toISOString().slice(0, 16)}`
    return !activityKeys.has(key)
  })

  const mergedActivities = ([...activities, ...uniqueLogs] as ActivityRow[]).sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  )

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(and(eq(tenantMembers.tenantId, tenant.id), isNull(tenantMembers.deletedAt)))

  const tags = await db
    .select({
      id: leadTags.id,
      name: leadTags.name,
      color: leadTags.color,
    })
    .from(leadTagAssignments)
    .innerJoin(leadTags, eq(leadTagAssignments.tagId, leadTags.id))
    .where(
      eq(leadTagAssignments.leadId, id)
    )

  const stageAssignments = await db
    .select({ stageKey: leadStageAssignments.stageKey })
    .from(leadStageAssignments)
    .where(
      and(
        eq(leadStageAssignments.leadId, id),
        eq(leadStageAssignments.tenantId, tenant.id),
      ),
    )

  return (
    <LeadDetailClient 
      lead={lead} 
      campaignName={campaignName}
      activities={mergedActivities} 
      allUsers={allUsers} 
      tags={tags} 
      activeStages={stageAssignments.map((r) => r.stageKey)}
      stageLabels={stageLabels}
      canMoveStageBackward={canMovePipelineBackward(permissions)}
    />
  )
}
