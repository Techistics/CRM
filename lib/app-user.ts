import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Ensures a `users` row exists for this Clerk user (global profile).
 * Workspace roles come from Clerk Organizations + `tenant_members`.
 */
export async function syncAppUserFromClerk(
  userId: string,
): Promise<(typeof users.$inferSelect) | null> {
  const client = await clerkClient()
  const cu = await client.users.getUser(userId)
  const email = cu.emailAddresses[0]?.emailAddress
  if (!email) return null

  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User'

  await db
    .insert(users)
    .values({ clerkId: userId, email, name, role: 'pro' })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name },
    })

  const [row] = await db.select().from(users).where(eq(users.clerkId, userId))
  return row ?? null
}

/** @deprecated Prefer syncTenantMembership + tenant-scoped queries */
export async function getProDbUser(userId: string) {
  const row = await syncAppUserFromClerk(userId)
  if (!row) return null
  return row
}
