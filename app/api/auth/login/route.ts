import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { users, tenantMembers, tenants } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { getCredentialVersionForSession } from '@/lib/session-credential'
import { loginSchema } from '@/lib/validators/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    let rawBody: unknown
    try { rawBody = await req.json() } catch { return errorResponse('Invalid JSON body', 'INVALID_JSON', 400) }

    // Extend loginSchema to accept optional tenantSlug
    const parsed = loginSchema.safeParse(rawBody)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)

    const { email, password, isSuperAdminLogin } = parsed.data as { email: string; password: string; isSuperAdminLogin?: boolean }

    // 1. Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user) return errorResponse('No account found with this email.', 'USER_NOT_FOUND', 404)

    // 2. SUPER_ADMIN path — two-step MFA flow
    if (user.globalRole === 'SUPER_ADMIN') {
      if (!isSuperAdminLogin) {
        return errorResponse('Please use the platform login page.', 'USE_PLATFORM_LOGIN', 403)
      }
      if (!user.password) return errorResponse('No password set.', 'NO_PASSWORD', 400)
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) return errorResponse('Incorrect password.', 'INVALID_PASSWORD', 401)

      const { signMfaToken, generateTotpSecret, encryptSecret } = await import('@/lib/totp')

      // MFA already configured — issue challenge token, no session yet
      if (user.totpEnabled) {
        const mfaToken = await signMfaToken(user.id)
        return successResponse({ requiresMfa: true, mfaToken })
      }

      // First login — generate secret and save (not yet enabled)
      const plainSecret = generateTotpSecret()
      const encryptedSecret = encryptSecret(plainSecret)
      await db
        .update(users)
        .set({ totpSecret: encryptedSecret })
        .where(eq(users.id, user.id))

      const mfaToken = await signMfaToken(user.id)
      return successResponse({ requiresMfaSetup: true, setupSecret: plainSecret, mfaToken })
    }

        // 3. Standard User path — verify against users.password and fetch memberships
    if (!user.password) return errorResponse('No password set.', 'NO_PASSWORD', 400)
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return errorResponse('Incorrect password.', 'INVALID_PASSWORD', 401)

    const memberships = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        role: tenantMembers.role,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, user.id))

    if (memberships.length === 0) {
      return errorResponse('User has no workspace memberships.', 'NO_WORKSPACE', 403)
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const credentialVersion = await getCredentialVersionForSession({ userId: user.id })

    if (memberships.length === 1) {
      const { tenantId, role, tenantSlug } = memberships[0]
      const sessionToken = await encrypt({
        userId: user.id,
        globalRole: null,
        tenantId,
        role,
        expiresAt,
        credentialVersion,
      })
      const response = successResponse({ tenantSlug, role })
      response.cookies.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
      })
      return response
    }

    // multiple memberships – return workspace list without setting tenant in session
    const sessionToken = await encrypt({
      userId: user.id,
      globalRole: null,
      expiresAt,
      credentialVersion,
    })
    const response = successResponse({
      workspaces: memberships.map(m => ({
        tenantSlug: m.tenantSlug,
        tenantId: m.tenantId,
        role: m.role,
        name: m.tenantName,
      })),
    })
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