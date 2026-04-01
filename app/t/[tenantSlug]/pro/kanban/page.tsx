import { eq, and } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import KanbanBoard from '@/components/KanbanBoard'
import { requireTenantSession } from '@/lib/tenant-server'

export default async function ProKanbanPage() {
  const { tenant, dbUserId } = await requireTenantSession()

  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      lastQualification: leads.lastQualification,
      assigneeName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(
      and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId)),
    )

  return (
    <KanbanBoard
      initialLeads={myLeads}
      baseApiUrl="/api/pro/leads"
      backUrl="/pro/leads"
    />
  )
}
