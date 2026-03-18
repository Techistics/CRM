import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { stage } = await req.json()

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser || dbUser.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify this lead is assigned to this pro
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.assignedTo, dbUser.id)))

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found or not assigned to you' }, { status: 404 })
  }

  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, id))

  await db.insert(leadActivities).values({
    leadId: id,
    userId: dbUser.id,
    type: 'stage_change',
    fromStage: lead.stage,
    toStage: stage,
  })

  return NextResponse.json({ success: true })
}