'use server'

import { db } from '@/db'
import { users, tenants, tenantMembers, invitations } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

type State = { error: string }

export async function signUpAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const tenantName = (formData.get('tenantName') as string)?.trim()

  if (!name || !email || !password || !tenantName) {
    return { error: 'All fields are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

  if (existing.length > 0) {
    return { error: 'An account with this email already exists.' }
  }

  const slug = tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const existingTenant = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))

  if (existingTenant.length > 0) {
    return { error: 'A workspace with this name already exists. Try a different business name.' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const [tenant] = await db
    .insert(tenants)
    .values({ name: tenantName, slug, status: 'active' })
    .returning()

  const [user] = await db
    .insert(users)
    .values({ name, email, password: hashedPassword, role: 'admin' as any })
    .returning()

  await db.insert(tenantMembers).values({
    tenantId: tenant.id,
    userId: user.id,
    role: 'tenant_admin',
  })

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: 'tenant_admin',
  })

  redirect(`/t/${tenant.slug}`)
}

export async function acceptInviteAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const token = formData.get('token') as string
  const name = (formData.get('name') as string)?.trim()
  const password = formData.get('password') as string

  if (!token || !name || !password) {
    return { error: 'All fields are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  // ── Validate token ──
  const [invite] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      tenantId: invitations.tenantId,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
    })
    .from(invitations)
    .where(eq(invitations.token, token))

  if (!invite) {
    return { error: 'Invalid or expired invitation link.' }
  }
  if (invite.acceptedAt) {
    return { error: 'This invitation has already been used.' }
  }
  if (new Date() > new Date(invite.expiresAt)) {
    return { error: 'This invitation has expired. Ask your admin to resend it.' }
  }

  // ── Check email not already taken ──
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invite.email))

  if (existing.length > 0) {
    return { error: 'An account with this email already exists. Please sign in instead.' }
  }

  // ── Get tenant ──
  const [tenant] = await db
    .select({ id: tenants.id, slug: tenants.slug, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, invite.tenantId))

  if (!tenant || tenant.status === 'suspended') {
    return { error: 'This workspace is no longer active.' }
  }

  // ── Create user + membership + mark invite used ──
  const hashedPassword = await bcrypt.hash(password, 12)

  const [user] = await db
    .insert(users)
    .values({
      name,
      email: invite.email,
      password: hashedPassword,
      role: invite.role === 'tenant_admin' ? 'admin' as any : 'pro' as any,
    })
    .returning()

  await db.insert(tenantMembers).values({
    tenantId: tenant.id,
    userId: user.id,
    role: invite.role,
  })

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invite.id))

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: invite.role,
  })

  redirect(`/t/${tenant.slug}`)
}