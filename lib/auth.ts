import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers, users } from '@/db/schema'
import { env } from '@/lib/env'

const key = new TextEncoder().encode(env.JWT_SECRET)

export type SessionPayload = {
  userId: string
  globalRole: 'SUPER_ADMIN' | null
  tenantId?: string
  tenantSlug?: string
  role?: 'ADMIN' | 'PRO'
  expiresAt: Date
  /** Bumped on password change to invalidate existing sessions. */
  credentialVersion?: number
  superAdminActiveTenantId?: string
}

export async function encrypt(payload: SessionPayload) {
  const ttl = payload.globalRole === 'SUPER_ADMIN' ? '1h' : '2h'
  const expiresAt = new Date(Date.now() + (payload.globalRole === 'SUPER_ADMIN' ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000))
  payload.expiresAt = expiresAt

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key)
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    const session = payload as unknown as SessionPayload

    // Safety check for internal expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null
    }

    if (!(await isCredentialVersionValid(session))) {
      return null
    }

    return session
  } catch {
    return null
  }
}

async function isCredentialVersionValid(session: SessionPayload): Promise<boolean> {
  const tokenVersion = session.credentialVersion ?? 0

  if (session.tenantId) {
    const [membership] = await db
      .select({ credentialVersion: tenantMembers.credentialVersion })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, session.userId),
          eq(tenantMembers.tenantId, session.tenantId),
        ),
      )
      .limit(1)
    return (membership?.credentialVersion ?? 0) === tokenVersion
  }

  const [user] = await db
    .select({ credentialVersion: users.credentialVersion })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
  return (user?.credentialVersion ?? 0) === tokenVersion
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value
  if (!session) return null
  return await decrypt(session)
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  if (!session) return

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session)
  if (!parsed) return
  
  const ttlOffset = parsed.globalRole === 'SUPER_ADMIN' ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000
  parsed.expiresAt = new Date(Date.now() + ttlOffset)
  const res = NextResponse.next()
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expiresAt,
  })
  return res
}

export async function logout() {
  ;(await cookies()).set('session', '', { expires: new Date(0) })
}
