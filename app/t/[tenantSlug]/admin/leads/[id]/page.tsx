import { db } from '@/db'
import { leadActivities, users, tenantMembers } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
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
    .where(eq(tenantMembers.tenantId, tenant.id))

  return (
    <LeadDetailClient lead={lead} activities={activities} allUsers={allUsers} />
  )
}
