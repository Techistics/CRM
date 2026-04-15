import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadReminders } from '@/db/schema'
import { reconcileOverdueRemindersForTenant } from '@/lib/lead-reminders-sync'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    ctx.role,
    ctx.dbUserId,
  )
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  await reconcileOverdueRemindersForTenant(ctx.tenant.id)

  const reminders = await db
    .select()
    .from(leadReminders)
    .where(
      and(eq(leadReminders.tenantId, ctx.tenant.id), eq(leadReminders.leadId, id)),
    )
    .orderBy(asc(leadReminders.dueAt))

  return NextResponse.json({ reminders })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
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
  const title = String(body?.title ?? '').trim()
  const dueAt = body?.dueAt ? new Date(body.dueAt) : null
  if (!title || !dueAt || Number.isNaN(dueAt.getTime())) {
    return NextResponse.json(
      { error: 'Valid title and dueAt are required' },
      { status: 400 },
    )
  }

  const [created] = await db
    .insert(leadReminders)
    .values({
      tenantId: ctx.tenant.id,
      leadId: id,
      title,
      note: body?.note ? String(body.note).trim() : null,
      dueAt,
      assignedTo: lead.assignedTo ?? ctx.dbUserId,
      createdBy: ctx.dbUserId,
      status: dueAt.getTime() < Date.now() ? 'overdue' : 'pending',
      updatedAt: new Date(),
    })
    .returning()

  await db.insert(leadActivities).values({
    tenantId: ctx.tenant.id,
    leadId: id,
    userId: ctx.dbUserId,
    type: 'note',
    note: `Reminder created: ${title} (${dueAt.toLocaleString()})`,
  })

  return NextResponse.json({ reminder: created }, { status: 201 })
}
