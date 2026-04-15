import { getSession } from '@/lib/auth'

/**
 * Returns true if the current session belongs to a platform super-admin.
 * This replaces the old Clerk-based super-admin check.
 */
export async function isPlatformSuperAdmin(): Promise<boolean> {
  const session = await getSession()
  return session?.role === 'super_admin'
}
