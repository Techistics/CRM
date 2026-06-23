import { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, notifications, tenantMembers, users } from '@/db/schema'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requireTenantMemberApi, requirePermissionApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { can } from '@/lib/authz'
import { getTenantMembershipWithPermissions } from '@/lib/tenant-membership'
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
      toMemberScope(ctx),
    )
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    if (ctx.role === 'PRO' && !can(ctx.permissions, 'leads.assign')) {
      if (!assignedTo) return errorResponse('PRO cannot unassign leads', 'FORBIDDEN', 403)

      const targetMember = await getTenantMembershipWithPermissions(assignedTo, ctx.tenant.id)

      if (!targetMember) {
        return errorResponse('Assignee is not in this workspace', 'INVALID_ASSIGNEE', 400)
      }
      if (targetMember.role !== 'ADMIN' && !can(targetMember.permissions, 'leads.receive')) {
        return errorResponse(
          'PRO users can only assign leads to admins or authorized PROs',
          'FORBIDDEN',
          403,
        )
      }
    }

    const isProReassigning = ctx.role === 'PRO' && !can(ctx.permissions, 'leads.assign')

    let reassignedFrom: string | null = null
    if (isProReassigning && assignedTo) {
      reassignedFrom = ctx.dbUserId
    } else if (ctx.role === 'ADMIN' && assignedTo) {
      const targetMember = await getTenantMembershipWithPermissions(assignedTo, ctx.tenant.id)
      if (
        targetMember?.role === 'PRO' &&
        can(targetMember.permissions, 'leads.receive')
      ) {
        reassignedFrom = ctx.dbUserId
      }
    }

    await db
      .update(leads)
      .set({
        assignedTo: assignedTo || null,
        updatedAt: new Date(),
        reassignedFrom,
      })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    if (assignedTo) {
      const notificationTitle =
        reassignedFrom && ctx.role === 'ADMIN' ? 'Lead reassigned to you' : 'New lead assigned'
      const notificationBody =
        reassignedFrom && ctx.role === 'ADMIN'
          ? `${lead.fullName} has been reassigned to you`
          : `${lead.fullName} has been assigned to you`

      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId: assignedTo,
        title: notificationTitle,
        body: notificationBody,
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

      const [assigneeMembership] = assignedTo
        ? await db
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
        : [undefined]

      if (agent?.email) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          const rolePath = assigneeMembership?.role === 'PRO' ? 'pro' : 'admin'
          const leadUrl = `${baseUrl}/t/${ctx.tenant.slug}/${rolePath}/leads/${id}`
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