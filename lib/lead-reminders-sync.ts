import { and, eq, isNull, lte, ne } from 'drizzle-orm'

import { db } from '@/db'
import { leadReminders, leads, tenantMembers, tenants, users } from '@/db/schema'
import { sendReminderEmail } from '@/lib/mail'

/** Mark past-due reminders as overdue and trigger reminder emails when due. */
export async function reconcileOverdueRemindersForTenant(tenantId: string) {
  const now = new Date()

  // 1. Fetch all due reminders that haven't sent an email yet
  const dueUnsent = await db
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
        eq(leadReminders.tenantId, tenantId),
        ne(leadReminders.status, 'completed'),
        lte(leadReminders.dueAt, now),
        isNull(leadReminders.emailSentAt),
      ),
    )

  for (const reminder of dueUnsent) {
    try {
      // Mark emailSentAt & overdue immediately
      await db
        .update(leadReminders)
        .set({
          status: 'overdue',
          emailSentAt: now,
          updatedAt: now,
        })
        .where(eq(leadReminders.id, reminder.id))

      if (!reminder.assignedTo) continue

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

      if (agent?.email) {
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
      }
    } catch (err) {
      console.error(`[reminder-sync] Failed processing reminder ${reminder.id}:`, err)
    }
  }

  // 2. Mark any remaining past-due pending reminders as overdue
  await db
    .update(leadReminders)
    .set({ status: 'overdue', updatedAt: now })
    .where(
      and(
        eq(leadReminders.tenantId, tenantId),
        eq(leadReminders.status, 'pending'),
        lte(leadReminders.dueAt, now),
      ),
    )
}
