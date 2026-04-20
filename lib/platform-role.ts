import { getSession } from './auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/** True when this database user has `role: super_admin`. */
export async function isPlatformSuperAdmin(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  return await isPlatformSuperAdminUserId(session.userId)
}

/** Check by user ID (DB uuid) */
export async function isPlatformSuperAdminUserId(
  userId: string,
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  })

  return user?.globalRole === 'SUPER_ADMIN'
}
