import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, users } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser) return NextResponse.json({ notifications: [] })

  const userNotifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, dbUser.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20)

  return NextResponse.json({ notifications: userNotifs })
}