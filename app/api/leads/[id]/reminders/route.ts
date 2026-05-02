import { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leadActivities, leadReminders, leads, users, tenantMembers } from '@/db/schema'
import { reconcileOverdueRemindersForTenant } from '@/lib/lead-reminders-sync'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { sendReminderEmail } from '@/lib/mail'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  dueAt: z.string().datetime(),
  note: z.string().optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
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
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    await reconcileOverdueRemindersForTenant(ctx.tenant.id)

    const reminders = await db
      .select()
      .from(leadReminders)
      .where(
        and(eq(leadReminders.tenantId, ctx.tenant.id), eq(leadReminders.leadId, id)),
      )
      .orderBy(asc(leadReminders.dueAt))

    return successResponse({ reminders })
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
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
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = reminderSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
    }

    const { title, dueAt: dueAtStr, note } = parsed.data
    const dueAt = new Date(dueAtStr)

    const [created] = await db
      .insert(leadReminders)
      .values({
        tenantId: ctx.tenant.id,
        leadId: id,
        title: title.trim(),
        note: note?.trim() || null,
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

    await db
      .update(leads)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    // Email logic: Always fire if there's an assigned agent
    if (lead.assignedTo) {
      const [agent] = await db
        .select({
          email: users.email,
          name: users.name,
          role: tenantMembers.role,
        })
        .from(users)
        .innerJoin(tenantMembers, eq(users.id, tenantMembers.userId))
        .where(
          and(
            eq(users.id, lead.assignedTo),
            eq(tenantMembers.tenantId, ctx.tenant.id)
          )
        )
        .limit(1)

      if (agent?.email) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          const rolePath = agent.role === 'ADMIN' ? 'admin' : 'pro'
          const leadUrl = `${baseUrl}/t/${ctx.tenant.slug}/${rolePath}/leads/${id}`
          
          await sendReminderEmail({
            agentEmail: agent.email,
            agentName: agent.name ?? 'Agent',
            reminderTitle: title.trim(),
            reminderNote: note?.trim() || null,
            leadName: lead.fullName,
            leadEmail: lead.email,
            leadPhone: lead.contactNumber,
            dueAt,
            leadUrl,
            workspaceName: ctx.tenant.name,
          })
        } catch (err) {
          console.error('[reminder] Email failed:', err)
        }
      }
    }

    return successResponse({ reminder: created }, 201)
  })
}

