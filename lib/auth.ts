import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only'
const key = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  globalRole: 'SUPER_ADMIN' | null
  tenantId?: string
  tenantSlug?: string
  role?: 'ADMIN' | 'PRO'
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
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

    return session
  } catch {
    return null
  }
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
  
  parsed.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
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
