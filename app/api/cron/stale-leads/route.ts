import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { leads, users, leadReminders, notifications } from '@/db/schema'

export async function POST(req: NextRequest) {
  // 1. Security Check
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const staleLeads = await db
      .select({
        leadId: leads.id,
        tenantId: leads.tenantId,
        fullName: leads.fullName,
        updatedAt: leads.updatedAt,
        agentId: leads.assignedTo,
      })
      .from(leads)
      .where(
        and(
          eq(leads.stage, 'follow_up'),
          sql`${leads.updatedAt} < now() - interval '7 days'`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${leadReminders} r 
            WHERE r.lead_id = ${leads.id} AND r.due_at > now()
          )`
        )
      )

    let processed = 0
    let remindersCreated = 0
    let notificationsSent = 0
    const errors: string[] = []

    const [systemUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.globalRole, 'SUPER_ADMIN'))
      .limit(1)
    
    const creatorId = systemUser?.id
    if (!creatorId) {
      return NextResponse.json({ error: 'No system/admin user found to create reminders' }, { status: 500 })
    }

    for (let i = 0; i < staleLeads.length; i += 50) {
      const batch = staleLeads.slice(i, i + 50)
      
      await Promise.all(batch.map(async (lead) => {
        try {
          processed++
          
          const daysSince = Math.floor((Date.now() - new Date(lead.updatedAt || 0).getTime()) / (1000 * 60 * 60 * 24))
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(9, 0, 0, 0)

          // 1. Create reminder
          await db.insert(leadReminders).values({
            tenantId: lead.tenantId,
            leadId: lead.leadId,
            title: `Lead stale: in Follow Up for ${daysSince} days`,
            note: 'Automated stale lead reminder',
            dueAt: tomorrow,
            assignedTo: lead.agentId,
            createdBy: creatorId,
            status: 'pending',
          })
          remindersCreated++

          // 2. Create In-App Notification if lead is assigned
          if (lead.agentId) {
            await db.insert(notifications).values({
              tenantId: lead.tenantId,
              userId: lead.agentId,
              title: 'Stale Lead Follow-up',
              body: `Lead "${lead.fullName}" has been in Follow Up for ${daysSince} days without activity.`,
              type: 'stale_lead',
              leadId: lead.leadId,
            })
            notificationsSent++
          }
        } catch (err) {
          errors.push(`Error processing lead ${lead.leadId}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }))
    }

    return NextResponse.json({
      processed,
      remindersCreated,
      notificationsSent,
      errors,
    })
  } catch (error) {
    console.error('[CRON_STALE_LEADS_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
