import { getSession } from '@/lib/auth'
import { getUserRole } from '@/lib/role'

/** Custom session user id if the signed-in user has admin role. */
export async function requireAdminUserId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const role = await getUserRole()
  if (role !== 'admin') return null
  return session.userId
}
