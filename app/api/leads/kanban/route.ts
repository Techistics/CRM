import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { requirePermissionApi } from '@/lib/tenant-api'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('kanban.view')
    if (!ctx.ok) return ctx.response

    const scope = leadsVisibleWhere(ctx.tenant.id, ctx.role, ctx.dbUserId)

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
      .where(scope)
      .orderBy(desc(leads.updatedAt))

    return successResponse({ leads: allLeads })
  })
}
