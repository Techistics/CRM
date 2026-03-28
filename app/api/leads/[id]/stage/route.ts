import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { stage } = await req.json()

  // Get current lead
  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Get user from DB by email
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Update stage
  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, id))

  // Log activity
  await db.insert(leadActivities).values({
    leadId: id,
    userId: dbUser.id,
    type: 'stage_change',
    fromStage: lead.stage,
    toStage: stage,
  })

  return NextResponse.json({ success: true })
}