import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, notifications } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { assignedTo } = await req.json()

  // Get lead name
  const [lead] = await db.select().from(leads).where(eq(leads.id, id))

  await db
    .update(leads)
    .set({ assignedTo: assignedTo || null, updatedAt: new Date() })
    .where(eq(leads.id, id))

  // Notify the assigned pro user
  if (assignedTo && lead) {
    await db.insert(notifications).values({
      userId: assignedTo,
      title: 'New lead assigned',
      body: `${lead.fullName} has been assigned to you`,
      type: 'lead_assigned',
      leadId: id,
    })
  }

  return NextResponse.json({ success: true })
}