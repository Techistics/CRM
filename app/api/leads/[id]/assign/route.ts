import { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, notifications, tenantMembers, users } from '@/db/schema'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requireTenantMemberApi, requirePermissionApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const assignSchema = z.object({
  assignedTo: z.string().uuid().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    // PRO users can always reassign to admin — no leads.assign permission needed for that path.
    // ADMIN users still require leads.assign permission.
    const memberCtx = await requireTenantMemberApi()
    if (!memberCtx.ok) return memberCtx.response

    const ctx = memberCtx

    // If caller is ADMIN, enforce leads.assign permission
    if (ctx.role === 'ADMIN') {
      const permCtx = await requirePermissionApi('leads.assign')
      if (!permCtx.ok) return permCtx.response
    }

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid request body', 'INVALID_JSON', 400)

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)

    const { assignedTo } = parsed.data

    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    if (ctx.role === 'PRO') {
      if (!assignedTo) return errorResponse('PRO cannot unassign leads', 'FORBIDDEN', 403)

      const [targetMember] = await db
        .select({ role: tenantMembers.role })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.userId, assignedTo),
            isNull(tenantMembers.deletedAt),
          ),
        )
        .limit(1)

      if (!targetMember) {
        return errorResponse('Assignee is not in this workspace', 'INVALID_ASSIGNEE', 400)
      }
      if (targetMember.role !== 'ADMIN') {
        return errorResponse(
          'PRO users can only assign leads to workspace admins',
          'FORBIDDEN',
          403,
        )
      }
    }

    const isProReassigning = ctx.role === 'PRO'
    await db
      .update(leads)
      .set({
        assignedTo: assignedTo || null,
        updatedAt: new Date(),
        ...(isProReassigning && { reassignedFrom: ctx.dbUserId }),
        ...(!isProReassigning && { reassignedFrom: null }),
      })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    if (assignedTo) {
      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId: assignedTo,
        title: 'New lead assigned',
        body: `${lead.fullName} has been assigned to you`,
        type: 'lead_assigned',
        leadId: id,
      })
      const adminMembers = await db
        .select({ userId: tenantMembers.userId })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.role, 'ADMIN'),
            isNull(tenantMembers.deletedAt),
          ),
        )

      const adminRecipients = adminMembers
        .map((m) => m.userId)
        .filter((uid) => uid !== ctx.dbUserId && uid !== assignedTo)

      for (const userId of adminRecipients) {
        await db.insert(notifications).values({
          tenantId: ctx.tenant.id,
          userId,
          title: 'Lead assigned',
          body: `${lead.fullName} has been assigned to a counselor`,
          type: 'lead_assigned',
          leadId: id,
        })
      }

      const [agent] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1)

      if (agent?.email) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          const leadUrl = `${baseUrl}/t/${ctx.tenant.slug}/admin/leads/${id}`
          await sendLeadAssignedEmail({
            agentEmail: agent.email,
            agentName: agent.name ?? 'Counselor',
            leadName: lead.fullName,
            contactNumber: lead.contactNumber ?? '',
            leadEmail: lead.email ?? '',
            stage: lead.stage ?? 'new_lead',
            leadUrl,
            workspaceName: ctx.tenant.name,
          })
        } catch (err) {
          console.error('[assign] Email failed:', err)
        }
      }
    }

    return successResponse({ success: true })
  })
}