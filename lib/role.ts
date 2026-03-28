import { auth, currentUser } from '@clerk/nextjs/server'

export type AppRole = 'admin' | 'pro'

export function normalizeAppRole(value: unknown): AppRole | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if (v === 'admin' || v === 'pro') return v
  return undefined
}

/** Role from JWT session claims (if you added `metadata` in Clerk session token) or Clerk user object. */
export async function getUserRole(): Promise<AppRole | undefined> {
  const { sessionClaims } = await auth()
  const fromClaims = normalizeAppRole(
    (sessionClaims?.metadata as { role?: unknown } | undefined)?.role
  )

  const user = await currentUser()
  const fromUser = normalizeAppRole(
    user?.publicMetadata?.role ?? user?.unsafeMetadata?.role
  )

  return fromClaims ?? fromUser
}


