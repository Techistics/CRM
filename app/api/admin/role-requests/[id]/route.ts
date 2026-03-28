import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdminClerkId } from '@/lib/admin-auth'
import { syncAppUserFromClerk } from '@/lib/app-user'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminClerkId = await requireAdminClerkId()
  if (!adminClerkId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: { decision?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const decision = body.decision
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 })
  }

  const [row] = await db.select().from(roleRequests).where(eq(roleRequests.id, id))
  if (!row || row.status !== 'pending') {
    return NextResponse.json({ error: 'Request not found or already handled' }, { status: 404 })
  }

  const now = new Date()

  if (decision === 'reject') {
    await db
      .update(roleRequests)
      .set({
        status: 'rejected',
        reviewedAt: now,
        reviewedByClerkId: adminClerkId,
      })
      .where(eq(roleRequests.id, id))
    return NextResponse.json({ ok: true })
  }

  const client = await clerkClient()
  await client.users.updateUser(row.clerkId, {
    publicMetadata: { role: row.requestedRole },
  })

  await syncAppUserFromClerk(row.clerkId)

  await db
    .update(roleRequests)
    .set({
      status: 'approved',
      reviewedAt: now,
      reviewedByClerkId: adminClerkId,
    })
    .where(eq(roleRequests.id, id))

  return NextResponse.json({ ok: true })
}
