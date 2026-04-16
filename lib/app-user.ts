import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

/** Get the current logged-in user's db row from session. */
export async function getAppUser() {
  const session = await getSession()
  if (!session) return null

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))

  return user ?? null
}

/** @deprecated Use getAppUser() instead */
export async function getProDbUser(userId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
  return row ?? null
}

/** @deprecated No longer needed — users are created on sign-up/invite */
export async function syncAppUserFromClerk() {
  return null
}