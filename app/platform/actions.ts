'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { getSession } from '@/lib/auth'

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

  const session = await getSession()
  if (!session) redirect('/sign-in')

  const name = String(formData.get('name') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()
  
  if (!name) throw new Error('Name is required')
  const slug = slugify(slugRaw || name)
  if (!slug) throw new Error('Invalid slug')

  const [exists] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  if (exists) throw new Error('Slug already in use')

  await db.insert(tenants).values({
    slug,
    name,
    status: 'active',
  })

  redirect('/platform/tenants')
}

export async function inviteWorkspaceUserAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const session = await getSession()
  if (!session) redirect('/sign-in')

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

  // Implementation of invitation logic:
  // For now, we'll return a message that they should use the /sign-up flow 
  // and the admin should add them via the team management UI which we've refactored.
  throw new Error('Invitations are temporarily disabled. Please add users directly via Team Management.')
}

export async function deleteWorkspaceAction(formData: FormData) {
  const allowed = await isPlatformSuperAdmin()
  if (!allowed) throw new Error('Forbidden')

  const session = await getSession()
  if (!session) redirect('/sign-in')

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) throw new Error('Tenant ID is required')

  await db
    .update(tenants)
    .set({ deletedAt: new Date() })
    .where(eq(tenants.id, tenantId))

  redirect('/platform/tenants')
}
