import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { syncAppUserFromClerk } from '@/lib/app-user'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { userId: reviewerClerkId } = await auth()
  if (!reviewerClerkId) {
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

  const [row] = await db.select().from(roleRequests).where(eq(roleRequests.id, id))
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
        reviewedByClerkId: reviewerClerkId,
      })
      .where(eq(roleRequests.id, id))
    return NextResponse.json({ ok: true })
  }

  const client = await clerkClient()
  try {
    await client.organizations.createOrganizationMembership({
      organizationId: ctx.tenant.clerkOrgId,
      userId: row.clerkId,
      role: row.requestedRole === 'admin' ? 'org:admin' : 'org:member',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      {
        error:
          'Could not add user to Clerk organization. They may already be a member.',
      },
      { status: 400 },
    )
  }

  await syncAppUserFromClerk(row.clerkId)

  await db
    .update(roleRequests)
    .set({
      status: 'approved',
      reviewedAt: now,
      reviewedByClerkId: reviewerClerkId,
      tenantId: row.tenantId ?? ctx.tenant.id,
    })
    .where(eq(roleRequests.id, id))

  return NextResponse.json({ ok: true })
}
