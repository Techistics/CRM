import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { users, tenantMembers, tenants } from '@/db/schema'
import { encrypt } from '@/lib/auth'
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

    // 2. SUPER_ADMIN path — no tenantSlug needed, verify against users.password
    if (user.globalRole === 'SUPER_ADMIN') {
      if (!isSuperAdminLogin) {
        return errorResponse('Please use the platform login page.', 'USE_PLATFORM_LOGIN', 403)
      }
      if (!user.password) return errorResponse('No password set.', 'NO_PASSWORD', 400)
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) return errorResponse('Incorrect password.', 'INVALID_PASSWORD', 401)

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
      const sessionToken = await encrypt({ userId: user.id, globalRole: 'SUPER_ADMIN', expiresAt })
      const response = successResponse({ user: { id: user.id, email: user.email, name: user.name, globalRole: user.globalRole }, memberships: [] })
      response.cookies.set('session', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: expiresAt, sameSite: 'lax', path: '/' })
      return response
    }

    // 3. Regular user — auto-detect tenant from memberships
    const memberships = await db
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        tenantPassword: tenantMembers.tenantPassword,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(and(
        eq(tenantMembers.userId, user.id),
        isNull(tenantMembers.deletedAt),
        eq(tenants.status, 'active')
      ))

    if (!memberships.length) return errorResponse('You are not a member of any workspace.', 'NOT_MEMBER', 403)

    // 4. Find membership where password matches
    let validMembership = null
    for (const m of memberships) {
      const passwordToCheck = m.tenantPassword ?? user.password
      if (!passwordToCheck) continue
      const valid = await bcrypt.compare(password, passwordToCheck)
      if (valid) { validMembership = m; break }
    }
    if (!validMembership) return errorResponse('Incorrect password.', 'INVALID_PASSWORD', 401)

    // 5. Single workspace → issue scoped session directly
    if (memberships.length === 1) {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
      const sessionToken = await encrypt({
        userId: user.id, globalRole: null,
        tenantId: validMembership.tenantId,
        tenantSlug: validMembership.tenantSlug,
        role: validMembership.role as 'ADMIN' | 'PRO',
        expiresAt,
      })
      const response = successResponse({
        user: { id: user.id, email: user.email, name: user.name, globalRole: null },
        tenantSlug: validMembership.tenantSlug,
        role: validMembership.role,
      })
      response.cookies.set('session', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: expiresAt, sameSite: 'lax', path: '/' })
      return response
    }

    // 6. Multiple workspaces → return list for frontend picker
    return successResponse({
      user: { id: user.id, email: user.email, name: user.name },
      workspaces: memberships.map(m => ({
        tenantId: m.tenantId,
        tenantSlug: m.tenantSlug,
        role: m.role,
        name: m.tenantName,
      })),
    })
  })
}