import { auth, clerkClient } from '@clerk/nextjs/server'

function clerkUserIsPlatformSuperAdmin(user: {
  publicMetadata?: Record<string, unknown>
  privateMetadata?: Record<string, unknown>
}): boolean {
  return (
    user.publicMetadata?.platformRole === 'super_admin' ||
    user.privateMetadata?.platformRole === 'super_admin'
  )
}

/** True when this Clerk user id has `platformRole: super_admin` in Clerk metadata. */
export async function isPlatformSuperAdminUserId(
  clerkUserId: string,
): Promise<boolean> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    return Boolean(clerkUserIsPlatformSuperAdmin(user))
  } catch {
    // Network / Clerk outage — fail closed to normal org membership path
    return false
  }
}

export async function isPlatformSuperAdmin(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false
  return isPlatformSuperAdminUserId(userId)
}
