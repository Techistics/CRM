import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser || dbUser.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const myLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.assignedTo, dbUser.id))

  return NextResponse.json({ leads: myLeads, user: dbUser })
}