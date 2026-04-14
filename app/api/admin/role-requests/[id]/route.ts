import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { roleRequests, tenantMembers, users } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getSession } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json(
      { error: 'decision must be approve or reject' },
      { status: 400 },
    )
  }

  const [row] = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.id, id))

  if (!row || row.status !== 'pending') {
    return NextResponse.json(
      { error: 'Request not found or already handled' },
      { status: 404 },
    )
  }

  if (row.tenantId && row.tenantId !== ctx.tenant.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  if (decision === 'reject') {
    await db
      .update(roleRequests)
      .set({
        status: 'rejected',
        reviewedAt: now,
        reviewedByUserId: session.userId,
      })
      .where(eq(roleRequests.id, id))
    return NextResponse.json({ ok: true })
  }

  // ── Approve: find the user by email and create membership ──
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, row.email))

  if (!user) {
    return NextResponse.json(
      { error: 'User account not found. They need to sign up first.' },
      { status: 400 },
    )
  }

  await db
    .insert(tenantMembers)
    .values({
      tenantId: ctx.tenant.id,
      userId: user.id,
      role: row.requestedRole as 'tenant_admin' | 'agent',
    })
    .onConflictDoNothing()

  await db
    .update(roleRequests)
    .set({
      status: 'approved',
      reviewedAt: now,
      reviewedByUserId: session.userId,
      tenantId: row.tenantId ?? ctx.tenant.id,
    })
    .where(eq(roleRequests.id, id))

  return NextResponse.json({ ok: true })
}