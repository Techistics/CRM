// POST /api/auth/verify-mfa
// Step 2 of SUPER_ADMIN login: verify TOTP code against an mfaToken challenge.
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

    // Fetch user and verify they are a SUPER_ADMIN with MFA enabled
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user || user.globalRole !== 'SUPER_ADMIN') {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }
    if (!user.totpEnabled || !user.totpSecret) {
      return errorResponse('MFA not configured for this account.', 'MFA_NOT_CONFIGURED', 400)
    }

    // Decrypt the stored secret and verify the TOTP code
    let plainSecret: string
    try {
      plainSecret = decryptSecret(user.totpSecret)
    } catch {
      return errorResponse('Internal error verifying MFA.', 'DECRYPT_ERROR', 500)
    }

    if (!verifyTotpCode(plainSecret, code)) {
      return errorResponse('Invalid MFA code.', 'INVALID_MFA_CODE', 401)
    }

    // Issue full SUPER_ADMIN session (1h TTL via encrypt)
    const credentialVersion = await getCredentialVersionForSession({ userId: user.id })
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // encrypt() will override this but keep consistent
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
