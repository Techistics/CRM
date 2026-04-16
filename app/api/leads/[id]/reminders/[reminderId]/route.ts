import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadReminders } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id, reminderId } = await params
  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    ctx.role,
    ctx.dbUserId,
  )
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
  }

  const body = await req.json()
  const nextStatus =
    body?.status !== undefined && body?.status !== null
      ? String(body.status)
      : undefined
  const nextDueAt =
    body?.dueAt !== undefined && body?.dueAt !== null
      ? new Date(body.dueAt)
      : undefined

  if (nextDueAt !== undefined && Number.isNaN(nextDueAt.getTime())) {
    return NextResponse.json({ error: 'Invalid dueAt' }, { status: 400 })
  }

  let dueAt = existing.dueAt
  if (nextDueAt !== undefined) dueAt = nextDueAt

  const dueMs =
    dueAt instanceof Date ? dueAt.getTime() : new Date(dueAt as string).getTime()

  let status = existing.status
  if (nextStatus === 'completed') status = 'completed'
  else if (nextStatus === 'pending' || nextStatus === 'overdue') status = nextStatus
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
    return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
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

  return NextResponse.json({ reminder: updated })
}
