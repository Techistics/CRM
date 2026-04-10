import { clerkClient } from '@clerk/nextjs/server'
import { and, count, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { tenantMembers, users } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'

type TeamRole = 'tenant_admin' | 'agent'

function toClerkRole(role: TeamRole): 'org:admin' | 'org:member' {
  return role === 'tenant_admin' ? 'org:admin' : 'org:member'
}

async function ensureNotLastAdmin(tenantId: string, targetUserId: string) {
  const [target] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, targetUserId),
      ),
    )

  if (target?.role !== 'tenant_admin') return null

  const [admins] = await db
    .select({ c: count() })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'tenant_admin'),
      ),
    )

  if (Number(admins?.c ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Workspace must keep at least one admin' },
      { status: 400 },
    )
  }

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { userId } = await params

  let body: { role?: TeamRole }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const role = body.role
  if (role !== 'tenant_admin' && role !== 'agent') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const [member] = await db
    .select({
      userId: tenantMembers.userId,
      clerkId: users.clerkId,
      currentRole: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(
      and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)),
    )
    .limit(1)

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (member.currentRole === 'tenant_admin' && role !== 'tenant_admin') {
    const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
    if (lastAdminCheck) return lastAdminCheck
  }

  const client = await clerkClient()
  try {
    await client.organizations.updateOrganizationMembership({
      organizationId: ctx.tenant.clerkOrgId,
      userId: member.clerkId,
      role: toClerkRole(role),
    })
  } catch (e) {
    const err = e as { errors?: Array<{ message?: string }>; message?: string }
    const message =
      err.errors?.[0]?.message ?? err.message ?? 'Failed to update member role'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await db
    .update(tenantMembers)
    .set({ role })
    .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { userId } = await params

  const [member] = await db
    .select({
      userId: tenantMembers.userId,
      clerkId: users.clerkId,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(
      and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)),
    )
    .limit(1)

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
  if (lastAdminCheck) return lastAdminCheck

  const client = await clerkClient()
  try {
    await client.organizations.deleteOrganizationMembership({
      organizationId: ctx.tenant.clerkOrgId,
      userId: member.clerkId,
    })
  } catch (e) {
    const err = e as { errors?: Array<{ message?: string }>; message?: string }
    const message =
      err.errors?.[0]?.message ?? err.message ?? 'Failed to remove member'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await db
    .delete(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))

  return NextResponse.json({ ok: true })
}
