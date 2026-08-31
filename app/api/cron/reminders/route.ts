import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull, lte, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { leadReminders, leads, tenantMembers, tenants, users } from '@/db/schema'
import { sendReminderEmail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  // Security: same pattern as stale-leads cron
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Fetch all reminders that are due and haven't sent an email yet
    const dueReminders = await db
      .select({
        id: leadReminders.id,
        tenantId: leadReminders.tenantId,
        leadId: leadReminders.leadId,
        title: leadReminders.title,
        note: leadReminders.note,
        dueAt: leadReminders.dueAt,
        assignedTo: leadReminders.assignedTo,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        leadName: leads.fullName,
        leadEmail: leads.email,
        leadPhone: leads.contactNumber,
      })
      .from(leadReminders)
      .innerJoin(leads, eq(leadReminders.leadId, leads.id))
      .innerJoin(tenants, eq(leadReminders.tenantId, tenants.id))
      .where(
        and(
          ne(leadReminders.status, 'completed'),
          lte(leadReminders.dueAt, sql`now()`),
          isNull(leadReminders.emailSentAt),
        ),
      )

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const reminder of dueReminders) {
      try {
        // Mark emailSentAt and overdue status
        await db
          .update(leadReminders)
          .set({ status: 'overdue', emailSentAt: now, updatedAt: now })
          .where(eq(leadReminders.id, reminder.id))

        if (!reminder.assignedTo) {
          skipped++
          continue
        }

        // Fetch agent info
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
              eq(users.id, reminder.assignedTo),
              eq(tenantMembers.tenantId, reminder.tenantId),
            ),
          )
          .limit(1)

        if (!agent?.email) {
          skipped++
          continue
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        const rolePath = agent.role === 'ADMIN' ? 'admin' : 'pro'
        const leadUrl = `${baseUrl}/t/${reminder.tenantSlug}/${rolePath}/leads/${reminder.leadId}`

        await sendReminderEmail({
          agentEmail: agent.email,
          agentName: agent.name ?? 'Counselor',
          reminderTitle: reminder.title,
          reminderNote: reminder.note,
          leadName: reminder.leadName,
          leadEmail: reminder.leadEmail,
          leadPhone: reminder.leadPhone,
          dueAt: reminder.dueAt,
          leadUrl,
          workspaceName: reminder.tenantName,
        })

        sent++
      } catch (err) {
        errors.push(
          `Reminder ${reminder.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    return NextResponse.json({ processed: dueReminders.length, sent, skipped, errors })
  } catch (error) {
    console.error('[CRON_REMINDERS_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
