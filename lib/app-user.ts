import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { normalizeAppRole } from '@/lib/role'

/**
 * Ensures a `users` row exists for this Clerk user when Clerk public/unsafe
 * metadata includes a valid app role. New users are not in the DB until this runs
 * (or a script inserts them).
 */
export async function syncAppUserFromClerk(
  userId: string
): Promise<(typeof users.$inferSelect) | null> {
  const client = await clerkClient()
  const cu = await client.users.getUser(userId)
  const email = cu.emailAddresses[0]?.emailAddress
  if (!email) return null

  const role = normalizeAppRole(
    cu.publicMetadata?.role ?? cu.unsafeMetadata?.role
  )
  if (!role) return null

  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User'

  await db
    .insert(users)
    .values({ clerkId: userId, email, name, role })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name, role },
    })

  const [row] = await db.select().from(users).where(eq(users.clerkId, userId))
  return row ?? null
}

/** For pro API routes: synced row must exist and role must be `pro`. */
export async function getProDbUser(userId: string) {
  const row = await syncAppUserFromClerk(userId)
  if (!row || row.role !== 'pro') return null
  return row
}
