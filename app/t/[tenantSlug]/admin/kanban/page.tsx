import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import KanbanBoard from '@/components/KanbanBoard'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function KanbanPage() {
  const { tenant } = await requireTenantAdminSession()

  const allLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      lastQualification: leads.lastQualification,
      assigneeName: users.name,
      assignedTo: leads.assignedTo,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(eq(leads.tenantId, tenant.id))

  return <KanbanBoard initialLeads={allLeads} />
}
