import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { assignedTo } = await req.json()

  await db
    .update(leads)
    .set({ assignedTo: assignedTo ?? null, updatedAt: new Date() })
    .where(eq(leads.id, id))

  return NextResponse.json({ success: true })
}