import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers, users } from '@/db/schema'

/** Credential version embedded in JWT; bumped on password change to invalidate sessions. */
export async function getCredentialVersionForSession(opts: {
  userId: string
  tenantId?: string | null
}): Promise<number> {
  if (opts.tenantId) {
    const [membership] = await db
      .select({ credentialVersion: tenantMembers.credentialVersion })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, opts.userId),
          eq(tenantMembers.tenantId, opts.tenantId),
        ),
      )
      .limit(1)
    return membership?.credentialVersion ?? 0
  }

  const [user] = await db
    .select({ credentialVersion: users.credentialVersion })
    .from(users)
    .where(eq(users.id, opts.userId))
    .limit(1)
  return user?.credentialVersion ?? 0
}
