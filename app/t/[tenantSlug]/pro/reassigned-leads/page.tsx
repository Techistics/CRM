import { eq, and, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { requirePermissionSession } from '@/lib/tenant-server'
import ProReassignedLeadsClient from './ProReassignedLeadsClient'

export default async function ProReassignedLeadsPage() {
  const { tenant, dbUserId } = await requirePermissionSession('leads.receive')

  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      reassignedFrom: leads.reassignedFrom,
      createdAt: leads.createdAt,
      reassignedByName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.reassignedFrom))
    .where(and(
      eq(leads.tenantId, tenant.id),
      eq(leads.assignedTo, dbUserId),
      isNotNull(leads.reassignedFrom),
      isNull(leads.deletedAt),
    ))

  return <ProReassignedLeadsClient leads={myLeads} tenantSlug={tenant.slug} />
}
