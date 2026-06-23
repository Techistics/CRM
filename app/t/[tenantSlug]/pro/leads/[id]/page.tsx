import { notFound } from 'next/navigation'
import { db } from '@/db'
import { leadActivities, users, tenantMembers, customRoles } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import ProLeadDetailClient from './ProLeadDetailClient'
import { requirePermissionSession } from '@/lib/tenant-server'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { stripDealFields, canViewPayments, canEditPayments } from '@/lib/leads/deal-access'
import { can } from '@/lib/authz'

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
    .where(eq(tenantMembers.tenantId, ctx.tenant.id))

  return (
    <ProLeadDetailClient
      lead={lead}
      activities={activities}
      allUsers={allUsers}
      currentUser={{ id: ctx.dbUserId }}
      canDelete={can(ctx.permissions, 'leads.delete')}
      canAssign={can(ctx.permissions, 'leads.assign')}
      canViewPayments={canViewPayments(ctx.role, ctx.permissions)}
      canEditPayments={canEditPayments(ctx.role, ctx.permissions)}
    />
  )
}
