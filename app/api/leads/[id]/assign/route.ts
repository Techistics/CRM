import { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, notifications, tenantMembers, users, customRoles } from '@/db/schema'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requirePermissionApi } from '@/lib/tenant-api'
import { getLeadInTenant } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { getPermissionsForMember, type Permission } from '@/lib/authz'

const assignSchema = z.object({
  assignedTo: z.string().uuid().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.view')
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid request body', 'INVALID_JSON', 400)

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)

    const { assignedTo } = parsed.data

    const lead = await getLeadInTenant(id, ctx.tenant.id)
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    // ADMIN can assign to anyone
    // PRO can only assign to: admins OR PROs with leads.receive permission (excluding themselves)
    if (ctx.role === 'PRO') {
      if (!assignedTo) return errorResponse('PRO cannot unassign leads', 'FORBIDDEN', 403)

      // Find target member
      const [targetMember] = await db
        .select()
        .from(tenantMembers)
        .where(and(
          eq(tenantMembers.tenantId, ctx.tenant.id),
          eq(tenantMembers.userId, assignedTo),
          isNull(tenantMembers.deletedAt),
        ))
        .limit(1)

      if (!targetMember) return errorResponse('Assignee is not in this workspace', 'INVALID_ASSIGNEE', 400)

      if (targetMember.role === 'ADMIN') {
        // Always allowed — PRO can assign to admin
      } else if (targetMember.role === 'PRO') {
        // Check if target PRO has leads.receive permission
        let targetPermissions: Permission[] = getPermissionsForMember('PRO', null)
        if (targetMember.customRoleId) {
          const roleRow = await db.query.customRoles.findFirst({
            where: eq(customRoles.id, targetMember.customRoleId),
            columns: { permissions: true },
          })
          targetPermissions = getPermissionsForMember('PRO', (roleRow?.permissions as Permission[]) ?? null)
        }
        if (!targetPermissions.includes('leads.receive')) {
          return errorResponse('This PRO cannot receive reassigned leads', 'FORBIDDEN', 403)
        }
        // Cannot assign to self
        if (assignedTo === ctx.dbUserId) {
          return errorResponse('You cannot assign a lead to yourself', 'FORBIDDEN', 403)
        }
      } else {
        return errorResponse('Invalid assignee role', 'FORBIDDEN', 403)
      }
    }

    // Build update payload
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

    // Notification + email
    if (assignedTo) {
      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId: assignedTo,
        title: 'New lead assigned',
        body: `${lead.fullName} has been assigned to you`,
        type: 'lead_assigned',
        leadId: id,
      })

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