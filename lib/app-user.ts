import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Retrieves the global profile for a user from the DB.
 * Logic is simplified since users are already created via custom registration.
 */
export async function getAppUser(
  userId: string,
): Promise<(typeof users.$inferSelect) | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId))
  return row ?? null
}

/** @deprecated Prefer direct DB queries or tenant-scoped helpers */
export async function getProDbUser(userId: string) {
  return await getAppUser(userId)
}
