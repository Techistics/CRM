import { notFound } from 'next/navigation'
import { db } from '@/db'
import { leadActivities, consultantLogs, users, tenantMembers, customRoles } from '@/db/schema'
import { and, desc, eq, isNull, aliasedTable } from 'drizzle-orm'
import ProLeadDetailClient from './ProLeadDetailClient'
import { requirePermissionSession } from '@/lib/tenant-server'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { stripDealFields, canViewPayments, canEditPayments } from '@/lib/leads/deal-access'
import { can, canMovePipelineBackward } from '@/lib/authz'
import type { ActivityRow } from '@/types/leads'
import { getTenantPipeline } from '@/lib/pipeline/config'

export default async function ProLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await requirePermissionSession('leads.view')
  const { id } = await params

  const leadRow = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
  if (!leadRow) notFound()

  const lead = stripDealFields(leadRow, ctx.role, ctx.permissions)

  const pipeline = await getTenantPipeline(ctx.tenant.id)
  const stageLabels = Object.fromEntries(pipeline.stages.map((s) => [s.key, s.label]))

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
        eq(leadActivities.tenantId, ctx.tenant.id),
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
        eq(consultantLogs.tenantId, ctx.tenant.id),
      ),
    )
    .orderBy(desc(consultantLogs.createdAt))

  const logs = rawLogs.map((l) => ({
    ...l,
    fromStage: null as string | null,
    toStage: null as string | null,
    createdAt: l.createdAt ?? null,
  }))

  // Merge and de-duplicate: prefer leadActivities rows; logs already mirrored
  // will have the same content but different IDs — deduplicate by note + createdAt minute
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
      permissions: customRoles.permissions,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .leftJoin(customRoles, eq(tenantMembers.customRoleId, customRoles.id))
    .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), isNull(tenantMembers.deletedAt)))

  return (
    <ProLeadDetailClient
      lead={lead}
      activities={mergedActivities}
      allUsers={allUsers}
      currentUser={{ id: ctx.dbUserId }}
      canDelete={can(ctx.permissions, 'leads.delete')}
      canAssign={can(ctx.permissions, 'leads.assign')}
      canMoveStageBackward={canMovePipelineBackward(ctx.permissions)}
      canViewPayments={canViewPayments(ctx.role, ctx.permissions)}
      canEditPayments={canEditPayments(ctx.role, ctx.permissions)}
      stageLabels={stageLabels}
    />
  )
}
