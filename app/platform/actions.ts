'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export async function createWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

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

  const [exists] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  if (exists) throw new Error('Slug already in use')

  const client = await clerkClient()
  // We do NOT need Clerk's org `slug` for our subdomain tenancy.
  // Tenants are routed by `tenants.slug` (DB), and we store Clerk org id separately.
  let org: { id: string }
  try {
    org = await client.organizations.createOrganization({
      name,
      createdBy: userId,
    })
  } catch (err: unknown) {
    const e = err as Record<string, unknown> | undefined
    const errors = e?.errors as Array<{ message?: string }> | undefined
    const msg =
      errors?.[0]?.message ||
      (e && typeof e === 'object' && 'message' in e ? String(e.message) : null) ||
      'Clerk organization creation failed'
    throw new Error(`Workspace creation failed: ${msg}`)
  }

  try {
    await client.organizations.createOrganizationInvitation({
      organizationId: org.id,
      inviterUserId: userId,
      emailAddress: firstAdminEmail,
      role: 'org:admin',
      redirectUrl: `${workspaceOrigin(slug)}/sign-in`,
    })
  } catch (err: unknown) {
    const e = err as Record<string, unknown> | undefined
    const errors = e?.errors as Array<{ message?: string }> | undefined
    const msg =
      errors?.[0]?.message ||
      (e && typeof e === 'object' && 'message' in e ? String(e.message) : null) ||
      'Could not invite first admin'
    throw new Error(`Workspace created, but invite failed: ${msg}`)
  }

  await db.insert(tenants).values({
    slug,
    name,
    brandName: brandName ?? name,
    clerkOrgId: org.id,
    status: 'active',
  })

  redirect('/platform/tenants')
}

export async function inviteWorkspaceUserAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const appRole = String(formData.get('role') ?? '').trim()

  if (!tenantId) throw new Error('Tenant is required')
  if (!email) throw new Error('Email is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email is invalid')
  }
  if (appRole !== 'tenant_admin' && appRole !== 'agent') {
    throw new Error('Invalid role')
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))

  if (!tenant) throw new Error('Workspace not found')

  const clerkRole = appRole === 'tenant_admin' ? 'org:admin' : 'org:member'
  const client = await clerkClient()

  try {
    await client.organizations.createOrganizationInvitation({
      organizationId: tenant.clerkOrgId,
      inviterUserId: userId,
      emailAddress: email,
      role: clerkRole,
      redirectUrl: `${workspaceOrigin(tenant.slug)}/sign-in`,
    })
  } catch (err: unknown) {
    const e = err as Record<string, unknown> | undefined
    const errors = e?.errors as Array<{ message?: string }> | undefined
    const msg =
      errors?.[0]?.message ||
      (e && typeof e === 'object' && 'message' in e ? String(e.message) : null) ||
      'Could not send invitation'
    throw new Error(`Invite failed: ${msg}`)
  }

  redirect('/platform/tenants')
}
