import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { tenants, users } from '@/db/schema'
import type { Tenant } from '@/types/models'

import { getSession } from '@/lib/auth'
import { resolveTenantAccess } from '@/lib/tenant-access'
import type { TenantAppRole } from '@/lib/tenant-membership'


export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })

    if (newPassword.length < 8)
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    if (!user || !user.password)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hashed = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ password: hashed }).where(eq(users.id, session.userId))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function getTenantSlugFromHeaders(): Promise<string | null> {
  const h = await headers()
  return h.get('x-tenant-slug')
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug))
  return row ?? null
}

export async function requireTenantFromHeaders(): Promise<Tenant> {
  const slug = await getTenantSlugFromHeaders()
  if (!slug) {
    redirect('/')
  }
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') {
    notFound()
  }
  return tenant
}

/** Server guard: signed-in user with workspace context. */
export async function requireTenantSession(): Promise<{
  tenant: Tenant
  dbUserId: string
  role: TenantAppRole
  user: {
    name: string
    email: string
  }
}> {
  const tenant = await requireTenantFromHeaders()
  const session = await getSession()
  
  if (!session) {
    redirect('/sign-in')
  }

  const actor = await resolveTenantAccess(session.userId, tenant)
  if (!actor) {
    redirect('/no-access?reason=not-in-org')
  }

  // Fetch full user data for profile info
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, actor.dbUserId),
    columns: {
      name: true,
      email: true,
    }
  })

  return { 
    tenant, 
    dbUserId: actor.dbUserId, 
    role: actor.role,
    user: userRow ?? { name: 'Unknown', email: 'unknown@example.com' }
  }
}

export async function requireTenantAdminSession() {
  const ctx = await requireTenantSession()
  if (ctx.role !== 'ADMIN') {
    redirect(`/t/${ctx.tenant.slug}/pro/overview`)
  }
  return ctx
}
