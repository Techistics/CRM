import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { loginSchema } from '@/lib/validators/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = loginSchema.safeParse(rawBody)
    if (!parsed.success) {
      return errorResponse(
        'Validation failed', 
        'VALIDATION_ERROR', 
        400
      )
    }

    const { email, password } = parsed.data

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return errorResponse('No account found with this email. Please create one.', 'USER_NOT_FOUND', 404)
    }

    if (!user.password) {
      return errorResponse('This account does not have a password set. Please use a reset link.', 'NO_PASSWORD', 400)
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return errorResponse('Incorrect password. Please try again.', 'INVALID_PASSWORD', 401)
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const sessionToken = await encrypt({ 
      userId: user.id, 
      globalRole: user.globalRole as 'SUPER_ADMIN' | null, 
      expiresAt 
    })

    // Fetch memberships in one optimized query
    const memberships = await db.query.tenantMembers.findMany({
      where: (tm, { eq, and, isNull }) => and(
        eq(tm.userId, user.id),
        isNull(tm.deletedAt)
      ),
      with: {
        tenant: true
      }
    })

    const data = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole
      },
      memberships: memberships.map(m => ({
        tenantId: m.tenantId,
        role: m.role,
        tenant: m.tenant
      }))
    }

    const response = successResponse(data)
    
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
