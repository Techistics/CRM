import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { syncAppUserFromClerk } from '@/lib/app-user'

type TeamRole = 'tenant_admin' | 'agent'

function toClerkRole(role: TeamRole): 'org:admin' | 'org:member' {
  return role === 'tenant_admin' ? 'org:admin' : 'org:member'
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { userId: inviterUserId } = await auth()
  if (!inviterUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; role?: TeamRole }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const role = body.role

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (role !== 'tenant_admin' && role !== 'agent') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const client = await clerkClient()
  const clerkRole = toClerkRole(role)

  let invitationId: string | null = null
  try {
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: ctx.tenant.clerkOrgId,
      inviterUserId,
      emailAddress: email,
      role: clerkRole,
    })
    invitationId = invitation.id ?? null
  } catch (e) {
    const err = e as { errors?: Array<{ message?: string }>; message?: string }
    const message =
      err.errors?.[0]?.message ??
      err.message ??
      'Could not invite the user to this workspace'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // If this user already exists in Clerk and app DB, immediately reflect membership in UI.
  const existing = await client.users.getUserList({ emailAddress: [email], limit: 1 })
  const existingUserId = existing.data[0]?.id
  if (existingUserId) {
    const appUser = await syncAppUserFromClerk(existingUserId)
    if (appUser) {
      await db
        .insert(tenantMembers)
        .values({ tenantId: ctx.tenant.id, userId: appUser.id, role })
        .onConflictDoUpdate({
          target: [tenantMembers.tenantId, tenantMembers.userId],
          set: { role },
        })
    }
  }

  return NextResponse.json({
    ok: true,
    invitationId,
    email,
    role,
    status: 'pending_invite',
  })
}
