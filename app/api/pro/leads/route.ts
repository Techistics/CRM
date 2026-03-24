import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getProDbUser } from '@/lib/app-user'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getProDbUser(userId)
  if (!dbUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const myLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.assignedTo, dbUser.id))

  return NextResponse.json({ leads: myLeads, user: dbUser })
}