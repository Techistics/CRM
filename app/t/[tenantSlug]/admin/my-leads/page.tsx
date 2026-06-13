import { eq, and, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { requireTenantAdminSession } from '@/lib/tenant-server'
import AdminMyLeadsClient from './AdminMyLeadsClient'

export default async function AdminMyLeadsPage() {
  const { tenant, dbUserId } = await requireTenantAdminSession()

  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      primaryStage: leads.primaryStage,
      assignedTo: leads.assignedTo,
      reassignedFrom: leads.reassignedFrom,
      createdAt: leads.createdAt,
      reassignedByName: users.name,
      reassignedByEmail: users.email,
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.reassignedFrom))
    .where(and(
      eq(leads.tenantId, tenant.id),
      eq(leads.assignedTo, dbUserId),
      isNotNull(leads.reassignedFrom),
      isNull(leads.deletedAt),
    ))

  return <AdminMyLeadsClient leads={myLeads} tenantSlug={tenant.slug} />
}