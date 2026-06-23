import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leadActivities, leadReminders } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { requireLeadEditApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const reminderPatchSchema = z.object({
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
  dueAt: z.string().datetime().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    const { id, reminderId } = await params
    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      toMemberScope(ctx),
    )
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const [existing] = await db
      .select()
      .from(leadReminders)
      .where(
        and(
          eq(leadReminders.id, reminderId),
          eq(leadReminders.tenantId, ctx.tenant.id),
          eq(leadReminders.leadId, id),
        ),
      )
      .limit(1)

    if (!existing) {
      return errorResponse('Reminder not found', 'NOT_FOUND', 404)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = reminderPatchSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
    }

    const { status: nextStatus, dueAt: nextDueAtStr } = parsed.data
    const nextDueAt = nextDueAtStr ? new Date(nextDueAtStr) : undefined

    let dueAt = existing.dueAt
    if (nextDueAt !== undefined) dueAt = nextDueAt

    const dueMs =
      dueAt instanceof Date ? dueAt.getTime() : new Date(dueAt as string).getTime()

    let status = existing.status
    if (nextStatus === 'completed') status = 'completed'
    else if (nextStatus !== undefined) status = nextStatus
    else if (nextDueAt !== undefined && status !== 'completed') {
      status = !Number.isNaN(dueMs) && dueMs < Date.now() ? 'overdue' : 'pending'
    }

    const completedAt =
      status === 'completed'
        ? existing.completedAt ?? new Date()
        : null

    const [updated] = await db
      .update(leadReminders)
      .set({
        status,
        dueAt,
        completedAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leadReminders.id, reminderId),
          eq(leadReminders.tenantId, ctx.tenant.id),
          eq(leadReminders.leadId, id),
        ),
      )
      .returning()

    if (!updated) {
      return errorResponse('Reminder not found', 'NOT_FOUND', 404)
    }

    const activityNote =
      nextStatus === 'completed'
        ? `Reminder completed: ${updated.title}`
        : nextDueAt !== undefined || nextStatus !== undefined
          ? `Reminder updated: ${updated.title}`
          : null

    if (activityNote) {
      await db.insert(leadActivities).values({
        tenantId: ctx.tenant.id,
        leadId: id,
        userId: ctx.dbUserId,
        type: 'note',
        note: activityNote,
      })
    }

    return successResponse({ reminder: updated })
  })
}
