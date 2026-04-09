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

  const body = await req.json()
  const nextStatus = body?.status ? String(body.status) : undefined
  const nextDueAt = body?.dueAt ? new Date(body.dueAt) : undefined

  const [updated] = await db
    .update(leadReminders)
    .set({
      status: nextStatus === 'completed' ? 'completed' : nextStatus === 'overdue' ? 'overdue' : 'pending',
      dueAt:
        nextDueAt && !Number.isNaN(nextDueAt.getTime())
          ? nextDueAt
          : undefined,
      completedAt: nextStatus === 'completed' ? new Date() : null,
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

  await db.insert(leadActivities).values({
    tenantId: ctx.tenant.id,
    leadId: id,
    userId: ctx.dbUserId,
    type: 'note',
    note:
      nextStatus === 'completed'
        ? `Reminder completed: ${updated.title}`
        : `Reminder updated: ${updated.title}`,
  })

  return NextResponse.json({ reminder: updated })
}
