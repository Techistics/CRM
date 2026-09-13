import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  leadCoAssignments,
  leads,
  notifications,
  tenantMembers,
  users,
} from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { broadcastNotification } from '@/lib/supabase-server'

const coAssignSchema = z.object({
  assignedUserId: z.string().uuid(),
})

const removeSchema = z.object({
  assignedUserId: z.string().uuid().optional(),
})

/** GET /api/leads/[id]/co-assign — fetch current co-assignee */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    const [coAssignment] = await db
      .select({
        id: leadCoAssignments.id,
        assignedUserId: leadCoAssignments.assignedUserId,
        assignedByUserId: leadCoAssignments.assignedByUserId,
        triggerStageKey: leadCoAssignments.triggerStageKey,
        createdAt: leadCoAssignments.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(leadCoAssignments)
      .leftJoin(users, eq(users.id, leadCoAssignments.assignedUserId))
      .where(eq(leadCoAssignments.leadId, id))
      .limit(1)

    return successResponse({ coAssignment: coAssignment ?? null })
  })
}

/** POST /api/leads/[id]/co-assign — create / replace the co-assignee */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid request body', 'INVALID_JSON', 400)

    const parsed = coAssignSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)

    const { assignedUserId } = parsed.data

    // Fetch lead — both primary owner and admin can co-assign
    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    // PRO users can only co-assign if they are the primary owner
    if (ctx.role === 'PRO' && lead.assignedTo !== ctx.dbUserId) {
      return errorResponse('Only the lead owner or an admin can co-assign this lead', 'FORBIDDEN', 403)
    }

    // Cannot co-assign to themselves or the primary assignee
    if (assignedUserId === ctx.dbUserId) {
      return errorResponse('Cannot co-assign to yourself', 'INVALID_ASSIGNEE', 400)
    }
    if (assignedUserId === lead.assignedTo) {
      return errorResponse('User is already the primary owner of this lead', 'INVALID_ASSIGNEE', 400)
    }

    // Verify the target user is a member of this tenant
    const [targetMember] = await db
      .select({ userId: tenantMembers.userId, role: tenantMembers.role })
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, ctx.tenant.id),
        eq(tenantMembers.userId, assignedUserId),
      ))
      .limit(1)

    if (!targetMember) {
      return errorResponse('Assignee is not a member of this workspace', 'INVALID_ASSIGNEE', 400)
    }

    // Upsert: replace any existing co-assignment for this lead
    await db
      .delete(leadCoAssignments)
      .where(eq(leadCoAssignments.leadId, id))

    const [newCoAssignment] = await db
      .insert(leadCoAssignments)
      .values({
        tenantId: ctx.tenant.id,
        leadId: id,
        assignedUserId,
        assignedByUserId: ctx.dbUserId,
        triggerStageKey: lead.primaryStage,
      })
      .returning()

    // Notify the co-assignee
    const [notif] = await db.insert(notifications).values({
      tenantId: ctx.tenant.id,
      userId: assignedUserId,
      title: 'Lead shared with you',
      body: `${lead.fullName} has been shared with you for collaboration`,
      type: 'lead_assigned',
      leadId: id,
    }).returning()

    await broadcastNotification(`notifs:${ctx.tenant.id}:${assignedUserId}`, notif)

    return successResponse({ coAssignment: newCoAssignment })
  })
}

/** DELETE /api/leads/[id]/co-assign — remove the co-assignee */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

    // PRO users can only remove co-assignment if they are the primary owner
    if (ctx.role === 'PRO' && lead.assignedTo !== ctx.dbUserId) {
      return errorResponse('Only the lead owner or an admin can remove co-assignment', 'FORBIDDEN', 403)
    }

    await db
      .delete(leadCoAssignments)
      .where(eq(leadCoAssignments.leadId, id))

    return successResponse({ success: true })
  })
}
