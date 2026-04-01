import { clerkClient } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers, users } from '@/db/schema'
import type { Tenant } from '@/types/models'

export type TenantAppRole = 'tenant_admin' | 'agent'

function mapClerkOrgRole(clerkRole: string): TenantAppRole | null {
  if (clerkRole === 'org:admin') return 'tenant_admin'
  if (
    clerkRole === 'org:member' ||
    clerkRole === 'org:basic_member' ||
    clerkRole === 'basic_member'
  ) {
    return 'agent'
  }
  return null
}

/** Upsert app user row and tenant_members from Clerk org membership. */
export async function syncTenantMembership(
  clerkUserId: string,
  tenant: Tenant,
): Promise<{ userId: string; role: TenantAppRole } | null> {
  const client = await clerkClient()
  const list = await client.users.getOrganizationMembershipList({
    userId: clerkUserId,
  })
  const m = list.data.find((x) => x.organization.id === tenant.clerkOrgId)
  if (!m) return null

  const role = mapClerkOrgRole(m.role)
  if (!role) return null

  const cu = await client.users.getUser(clerkUserId)
  const email = cu.emailAddresses[0]?.emailAddress
  if (!email) return null

  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User'

  await db
    .insert(users)
    .values({ clerkId: clerkUserId, email, name, role: 'pro' })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name },
    })

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId))
  if (!user) return null

  await db
    .insert(tenantMembers)
    .values({ tenantId: tenant.id, userId: user.id, role })
    .onConflictDoUpdate({
      target: [tenantMembers.tenantId, tenantMembers.userId],
      set: { role },
    })

  return { userId: user.id, role }
}

export async function getTenantMembership(
  dbUserId: string,
  tenantId: string,
): Promise<TenantAppRole | null> {
  const [row] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, dbUserId)),
    )
  return (row?.role as TenantAppRole) ?? null
}
