'use server'
import { redirect } from 'next/navigation'
import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { createInvitationAndSendEmail } from '@/lib/invitations/service'
import { isPlatformSuperAdmin } from '@/lib/platform-role'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function redirectCreateWorkspaceError(
  code:
    | 'name-required'
    | 'invalid-slug'
    | 'first-admin-email-required'
    | 'first-admin-email-invalid'
    | 'slug-in-use'
    | 'create-failed',
): never {
  redirect(`/platform/tenants/new?error=${code}`)
}

export async function createWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const session = await getSession()
  if (!session) redirect('/platform/sign-in')

  const name = String(formData.get('name') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()
  const firstAdminEmail = String(formData.get('firstAdminEmail') ?? '')
    .trim()
    .toLowerCase()

  if (!name) redirectCreateWorkspaceError('name-required')
  const slug = slugify(slugRaw || name)
  if (!slug) redirectCreateWorkspaceError('invalid-slug')
  if (!firstAdminEmail) redirectCreateWorkspaceError('first-admin-email-required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdminEmail)) {
    redirectCreateWorkspaceError('first-admin-email-invalid')
  }

  const [exists] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  if (exists) redirectCreateWorkspaceError('slug-in-use')

  try {
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug,
        name,
        status: 'active',
        createdBy: session.userId,
      })
      .returning({ id: tenants.id })

    await createInvitationAndSendEmail({
      tenantId: tenant.id,
      email: firstAdminEmail,
      role: 'ADMIN',
      tenantSlug: slug,
      tenantName: name,
      invitedBy: session.userId,
    })
  } catch {
    redirectCreateWorkspaceError('create-failed')
  }

  redirect('/platform/tenants')
}

export async function inviteWorkspaceUserAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const session = await getSession()
  if (!session) redirect('/platform/sign-in')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const appRole = String(formData.get('role') ?? '').trim()

  if (!tenantId) throw new Error('Tenant is required')
  if (!email) throw new Error('Email is required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email is invalid')
  }
  if (appRole !== 'ADMIN' && appRole !== 'PRO') {
    throw new Error('Invalid role')
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))

  if (!tenant) throw new Error('Workspace not found')

  await createInvitationAndSendEmail({
    tenantId: tenant.id,
    email,
    role: appRole,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    invitedBy: session.userId,
  })

  redirect('/platform/tenants')
}

import { revalidatePath } from 'next/cache'

export async function deleteWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) throw new Error('Workspace is required')

  await db
    .update(tenants)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))

  revalidatePath('/platform/tenants')
  return { success: true }
}

export async function restoreWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) throw new Error('Workspace is required')

  await db
    .update(tenants)
    .set({
      deletedAt: null,
    })
    .where(eq(tenants.id, tenantId))

  revalidatePath('/platform/tenants/recycle-bin')
  revalidatePath('/platform/tenants')
  return { success: true }
}

export async function hardDeleteWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) throw new Error('Workspace is required')

  await db.delete(tenants).where(eq(tenants.id, tenantId))

  revalidatePath('/platform/tenants/recycle-bin')
  return { success: true }
}

export async function bulkDeleteWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const tenantIdsString = String(formData.get('tenantIds') ?? '').trim()
  if (!tenantIdsString) throw new Error('Workspaces are required')
  
  const tenantIds = tenantIdsString.split(',')

  await db
    .update(tenants)
    .set({
      deletedAt: new Date(),
    })
    .where(inArray(tenants.id, tenantIds))

  revalidatePath('/platform/tenants')
  return { success: true }
}
