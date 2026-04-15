import { getSession } from '@/lib/auth'

/** Returns the db userId if the signed-in user is super_admin, otherwise null. */
export async function requireAdminClerkId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  if (session.role !== 'super_admin') return null
  return session.userId
}