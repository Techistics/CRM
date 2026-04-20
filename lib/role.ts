import { getSession } from './auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

import type { AppRole } from '@/types/roles'
export type { AppRole }

export function normalizeAppRole(value: unknown): AppRole | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toUpperCase()
  if (v === 'SUPER_ADMIN' || v === 'ADMIN' || v === 'PRO') return v as AppRole
  return undefined
}

/** 
 * Retrieves the global platform role from the database for the current session.
 */
export async function getUserRole(): Promise<AppRole | undefined> {
  const session = await getSession()
  if (!session) return undefined

  const [row] = await db
    .select({ role: users.globalRole })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  return normalizeAppRole(row?.role)
}
