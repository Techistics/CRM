'use server'

import { db } from '@/db'
import { tenants, invitations, users } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export async function createWorkspaceAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const name = String(formData.get('name') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()
  const brandName = String(formData.get('brandName') ?? '').trim() || null
  const firstAdminEmail = String(formData.get('firstAdminEmail') ?? '')
    .trim()
    .toLowerCase()

  if (!name) throw new Error('Name is required')
  const slug = slugify(slugRaw || name)
  if (!slug) throw new Error('Invalid slug')
  if (!firstAdminEmail) throw new Error('First admin email is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdminEmail)) {
    throw new Error('First admin email is invalid')
  }

  // ── Check slug not taken ──
  const [exists] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))

  if (exists) throw new Error('Slug already in use')

  // ── Create tenant ──
  const [tenant] = await db
    .insert(tenants)
    .values({ slug, name, brandName: brandName ?? name, status: 'active' })
    .returning()

  // ── Create invitation token ──
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours

  await db.insert(invitations).values({
    tenantId: tenant.id,
    email: firstAdminEmail,
    role: 'tenant_admin',
    token,
    invitedBy: session.userId,
    expiresAt,
  })

  // ── Send invite email ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/sign-up?token=${token}&email=${encodeURIComponent(firstAdminEmail)}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com',
    to: firstAdminEmail,
    subject: `You're invited to manage ${name} on CRM`,
    html: `
      <p>Hi,</p>
      <p>You've been invited as <strong>Admin</strong> of the <strong>${name}</strong> workspace.</p>
      <p>
        <a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Accept invitation
        </a>
      </p>
      <p>This link expires in 48 hours.</p>
      <p>If you did not expect this email, you can ignore it.</p>
    `,
  })

  redirect('/platform/tenants')
}

export async function inviteWorkspaceUserAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? '').trim()

  if (!tenantId) throw new Error('Tenant is required')
  if (!email) throw new Error('Email is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email is invalid')
  }
  if (role !== 'tenant_admin' && role !== 'agent') {
    throw new Error('Invalid role')
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))

  if (!tenant) throw new Error('Workspace not found')
  // ── Create invitation ──
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours

  await db.insert(invitations).values({
    tenantId: tenant.id,
    email,
    role: role as 'tenant_admin' | 'agent',
    token,
    invitedBy: session.userId,
    expiresAt,
  })

  // ── Send invite email ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/sign-up?token=${token}&email=${encodeURIComponent(email)}`
  const roleLabel = role === 'tenant_admin' ? 'Admin' : 'Agent'

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com',
    to: email,
    subject: `You're invited to join ${tenant.name} on CRM`,
    html: `
      <p>Hi,</p>
      <p>You've been invited as <strong>${roleLabel}</strong> of the <strong>${tenant.name}</strong> workspace.</p>
      <p>
        <a href="${inviteUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Accept invitation
        </a>
      </p>
      <p>This link expires in 48 hours.</p>
      <p>If you did not expect this email, you can ignore it.</p>
    `,
  })

  redirect('/platform/tenants')
}