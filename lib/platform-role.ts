import { auth, clerkClient } from '@clerk/nextjs/server'

export async function isPlatformSuperAdmin(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const flag =
    user.publicMetadata?.platformRole === 'super_admin' ||
    user.privateMetadata?.platformRole === 'super_admin'
  return Boolean(flag)
}
