import { notFound } from 'next/navigation'
import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import ProLeadDetailClient from './ProLeadDetailClient'
import { requireTenantSession } from '@/lib/tenant-server'

export default async function ProLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant, dbUserId } = await requireTenantSession()
  const { id } = await params

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.tenantId, tenant.id),
        eq(leads.assignedTo, dbUserId),
      ),
    )

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

  return <ProLeadDetailClient lead={lead} activities={activities} />
}
