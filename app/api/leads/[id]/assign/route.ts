import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, notifications, tenantMembers, users } from '@/db/schema'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getLeadInTenant } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const assignSchema = z.object({
  assignedTo: z.string().uuid().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid request body', 'INVALID_JSON', 400)
    }

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)
    }

    const { assignedTo } = parsed.data

    const lead = await getLeadInTenant(id, ctx.tenant.id)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    if (assignedTo) {
      const [member] = await db
        .select()
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.userId, assignedTo),
          ),
        )
        .limit(1)
      if (!member) {
        return errorResponse('Assignee is not in this workspace', 'INVALID_ASSIGNEE', 400)
      }
    }

    await db
      .update(leads)
      .set({ assignedTo: assignedTo || null, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    // Email logic
    if (assignedTo) {
      // 1. Create in-app notification
      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId: assignedTo,
        title: 'New lead assigned',
        body: `${lead.fullName} has been assigned to you`,
        type: 'lead_assigned',
        leadId: id,
      })

      // 2. Fetch agent details (id, name, email) from users table
      const [agent] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1)

      // 3. Send email only if agent exists and has an email
      if (agent?.email) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          const leadUrl = `${baseUrl}/t/${ctx.tenant.slug}/admin/leads/${id}`
          await sendLeadAssignedEmail({
            agentEmail: agent.email,
            agentName: agent.name ?? 'Agent',
            leadName: lead.fullName,
            contactNumber: lead.contactNumber ?? '',
            leadEmail: lead.email ?? '',
            stage: lead.stage ?? 'new_lead',
            leadUrl,
            workspaceName: ctx.tenant.name,
          })
        } catch (err) {
          // Skip email silently on failure as requested
          console.error('[assign] Email failed:', err)
        }
      }
    }

    return successResponse({ success: true })
  })
}

