import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getProDbUser } from '@/lib/app-user'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { note, type } = await req.json()
  if (!note?.trim()) return NextResponse.json({ error: 'Note is empty' }, { status: 400 })

  const dbUser = await getProDbUser(userId)
  if (!dbUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify lead belongs to this pro
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.assignedTo, dbUser.id)))

  if (!lead) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 403 })
  }

  await db.insert(leadActivities).values({
    leadId: id,
    userId: dbUser.id,
    type: type ?? 'note',
    note: note.trim(),
  })

  return NextResponse.json({ success: true })
}