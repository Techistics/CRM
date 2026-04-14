'use server'

import { db } from '@/db'
import { users, tenantMembers, tenants } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

type State = { error: string }

export async function signInAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))

  if (!user || !user.password) {
    return { error: 'Invalid email or password.' }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { error: 'Invalid email or password.' }
  }

  if (user.role === 'super_admin') {
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: null,
      tenantSlug: null,
      role: 'super_admin' as 'super_admin',
    })
    redirect('/platform')
  }

  const [membership] = await db
    .select({
      role: tenantMembers.role,
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantStatus: tenants.status,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(eq(tenantMembers.userId, user.id))

  if (!membership) {
    return { error: 'Your account has no workspace assigned. Contact your administrator.' }
  }

  if (membership.tenantStatus === 'suspended') {
    return { error: 'This workspace has been suspended. Contact support.' }
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenantSlug,
    role: membership.role,
  })

  redirect(`/t/${membership.tenantSlug}`)
}