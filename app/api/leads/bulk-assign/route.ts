import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, tenantMembers, users } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requirePermissionApi } from '@/lib/tenant-api'

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  assignedTo: z.string().uuid(),
  tenantSlug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.assign')
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    if (parsed.data.tenantSlug !== ctx.tenant.slug) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const [member] = await db
      .select({ 
        userId: tenantMembers.userId, 
        name: users.name, 
        email: users.email 
      })
      .from(tenantMembers)
      .innerJoin(users, eq(users.id, tenantMembers.userId))
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenant.id),
          eq(tenantMembers.userId, parsed.data.assignedTo),
        ),
      )
      .limit(1)
      
    if (!member) return errorResponse('Assignee is not in this workspace', 'INVALID_ASSIGNEE', 400)

    const updatedRows = await db
      .update(leads)
      .set({ assignedTo: parsed.data.assignedTo, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))
      .returning({ id: leads.id })

    if (member.email && updatedRows.length > 0) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        await sendLeadAssignedEmail({
          agentEmail: member.email,
          agentName: member.name ?? 'Counselor',
          leadName: `${updatedRows.length} leads assigned to you`,
          contactNumber: '-',
          leadEmail: '-',
          stage: 'Bulk Assignment',
          leadUrl: `${baseUrl}/t/${ctx.tenant.slug}/admin/leads`,
          workspaceName: ctx.tenant.name,
        })
      } catch (err) {
        console.error('[bulk-assign] Email failed:', err)
      }
    }

    return successResponse({ updated: updatedRows.length })
  })
}

