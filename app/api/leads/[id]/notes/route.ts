import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { note, type } = await req.json()
  if (!note?.trim()) return NextResponse.json({ error: 'Note is empty' }, { status: 400 })

  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser || dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.insert(leadActivities).values({
    leadId: id,
    userId: dbUser.id,
    type: type ?? 'note',
    note: note.trim(),
  })

  return NextResponse.json({ success: true })
}
