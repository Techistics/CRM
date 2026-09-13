import { db } from '@/db'
import { leadActivities, users, tenantMembers, leadTags, leadTagAssignments, leadStageAssignments, leadCoAssignments } from '@/db/schema'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'
import { requireTenantAdminSession } from '@/lib/tenant-server'
import { getLeadInTenant } from '@/lib/lead-tenant'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant } = await requireTenantAdminSession()
  const { id } = await params

  const lead = await getLeadInTenant(id, tenant.id)
  if (!lead) notFound()

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

  // Fetch existing co-assignee for this lead
  const [coAssignmentRow] = await db
    .select({
      id: leadCoAssignments.id,
      assignedUserId: leadCoAssignments.assignedUserId,
      assignedByUserId: leadCoAssignments.assignedByUserId,
      triggerStageKey: leadCoAssignments.triggerStageKey,
      createdAt: leadCoAssignments.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(leadCoAssignments)
    .leftJoin(users, eq(users.id, leadCoAssignments.assignedUserId))
    .where(eq(leadCoAssignments.leadId, id))
    .limit(1)

  return (
    <LeadDetailClient 
      lead={lead} 
      activities={activities} 
      allUsers={allUsers} 
      tags={tags} 
      activeStages={stageAssignments.map((r) => r.stageKey)}
      initialCoAssignment={coAssignmentRow ?? null}
    />
  )
}

