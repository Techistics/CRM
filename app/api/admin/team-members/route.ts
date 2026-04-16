import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { users, tenantMembers, invitations } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getSession } from '@/lib/auth'
import { and, eq, isNull } from 'drizzle-orm'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)

type TeamRole = 'tenant_admin' | 'agent'

export async function POST(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; role?: TeamRole }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  const role = body.role

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (role !== 'tenant_admin' && role !== 'agent') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // ── 1. Check if already a member ──
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

  if (existingUser) {
    const [membership] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, existingUser.id),
          eq(tenantMembers.tenantId, ctx.tenant.id),
        ),
      )

    if (membership) {
      return NextResponse.json(
        { error: 'This user is already a member of the workspace' },
        { status: 400 },
      )
    }
  }

  // ── 2. Check if already invited ──
  const [existingInvite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.tenantId, ctx.tenant.id),
        isNull(invitations.acceptedAt),
      ),
    )

  if (existingInvite) {
    if (new Date() < new Date(existingInvite.expiresAt)) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 400 },
      )
    }
    // If expired, we delete it and allow a new one
    await db.delete(invitations).where(eq(invitations.id, existingInvite.id))
  }

  // ── Create invitation ──
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48)

  await db.insert(invitations).values({
    tenantId: ctx.tenant.id,
    email,
    role,
    token,
    invitedBy: session.userId,
    expiresAt,
  })

  // ── Send invite email ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/sign-up?token=${token}&email=${encodeURIComponent(email)}`
  const roleLabel = role === 'tenant_admin' ? 'Admin' : 'Agent'

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@devclyst.syedbilal.site',
    to: email,
    subject: `You're invited to join ${ctx.tenant.name}`,
    html: `
      <p>Hi,</p>
      <p>You've been invited as <strong>${roleLabel}</strong> of <strong>${ctx.tenant.name}</strong>.</p>
      <p>
        <a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Accept invitation
        </a>
      </p>
      <p>This link expires in 48 hours.</p>
    `,
  })

  return NextResponse.json({ ok: true, email, role, status: 'pending_invite' })
}