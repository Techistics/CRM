import { and, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { leadReminders } from '@/db/schema'

/** Mark past-due pending reminders as overdue (call before listing). */
export async function reconcileOverdueRemindersForTenant(tenantId: string) {
  const now = new Date()
  await db
    .update(leadReminders)
    .set({ status: 'overdue', updatedAt: now })
    .where(
      and(
        eq(leadReminders.tenantId, tenantId),
        eq(leadReminders.status, 'pending'),
        lt(leadReminders.dueAt, now),
      ),
    )
}
