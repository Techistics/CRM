import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/role'

/** Clerk user id if the signed-in user has admin role in Clerk metadata. */
export async function requireAdminClerkId(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const role = await getUserRole()
  if (role !== 'admin') return null
  return userId
}
