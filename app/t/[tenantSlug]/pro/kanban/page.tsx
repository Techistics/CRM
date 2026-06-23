import { eq, and } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import KanbanBoard from '@/components/KanbanBoard'
import { requirePermissionSession } from '@/lib/tenant-server'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { toMemberScope } from '@/lib/member-scope'

export default async function ProKanbanPage() {
  const ctx = await requirePermissionSession('kanban.view')

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
      assignedTo: leads.assignedTo,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(leadsVisibleWhere(ctx.tenant.id, toMemberScope(ctx)))

  return (
    <KanbanBoard
      initialLeads={myLeads}
      baseApiUrl="/api/pro/leads"
    />
  )
}
