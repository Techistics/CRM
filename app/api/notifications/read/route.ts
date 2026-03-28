import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId } = await req.json()

  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (notificationId === 'all') {
    await db
      .update(notifications)
      .set({ read: 'true' })
      .where(eq(notifications.userId, dbUser.id))
  } else {
    await db
      .update(notifications)
      .set({ read: 'true' })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, dbUser.id)
        )
      )
  }

  return NextResponse.json({ success: true })
}