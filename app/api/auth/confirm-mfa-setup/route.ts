// POST /api/auth/confirm-mfa-setup
// Confirms first-time TOTP setup: verifies the code against the stored (but not-yet-enabled) secret,
// then marks totpEnabled = true and issues a full session.
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { getCredentialVersionForSession } from '@/lib/session-credential'
import { verifyMfaToken, decryptSecret, verifyTotpCode } from '@/lib/totp'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    let body: unknown
    try { body = await req.json() } catch { return errorResponse('Invalid JSON body', 'INVALID_JSON', 400) }

    const { mfaToken, code } = (body ?? {}) as { mfaToken?: string; code?: string }

    if (typeof mfaToken !== 'string' || !mfaToken) {
      return errorResponse('mfaToken is required', 'BAD_REQUEST', 400)
    }
    if (typeof code !== 'string' || code.length !== 6) {
      return errorResponse('code must be a 6-digit string', 'BAD_REQUEST', 400)
    }

    // Verify the challenge token
    const userId = await verifyMfaToken(mfaToken)
    if (!userId) {
      return errorResponse('MFA token expired or invalid. Please log in again.', 'INVALID_MFA_TOKEN', 401)
    }

    // Fetch user — must be SUPER_ADMIN with a stored (not yet enabled) secret
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user || user.globalRole !== 'SUPER_ADMIN') {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }
    if (!user.totpSecret) {
      return errorResponse('No setup secret found. Please log in again to restart setup.', 'NO_SETUP_SECRET', 400)
    }
    if (user.totpEnabled) {
      return errorResponse('MFA is already configured. Use /api/auth/verify-mfa instead.', 'ALREADY_ENABLED', 400)
    }

    // Decrypt the pending secret and verify the code
    let plainSecret: string
    try {
      plainSecret = decryptSecret(user.totpSecret)
    } catch {
      return errorResponse('Internal error verifying setup code.', 'DECRYPT_ERROR', 500)
    }

    if (!verifyTotpCode(plainSecret, code)) {
      return errorResponse('Invalid code — check your authenticator app.', 'INVALID_CODE', 401)
    }

    // Enable MFA — secret is already saved from the login step
    await db
      .update(users)
      .set({ totpEnabled: true })
      .where(eq(users.id, user.id))

    // Issue full SUPER_ADMIN session (1h TTL via encrypt)
    const credentialVersion = await getCredentialVersionForSession({ userId: user.id })
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const sessionToken = await encrypt({
      userId: user.id,
      globalRole: 'SUPER_ADMIN',
      expiresAt,
      credentialVersion,
    })

    const response = successResponse({ success: true })
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    })
    return response
  })
}
