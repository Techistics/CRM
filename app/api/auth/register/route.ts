import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { users, invitations, tenantMembers, auditLogs } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  invite_token: z.string().optional(),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { email: rawEmail, password, name, invite_token } = result.data
    const email = rawEmail.toLowerCase().trim()

    // 1. Check for valid invitation
    const [invite] = await db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.email, email), 
        eq(invitations.status, 'PENDING')
      ))
      .limit(1)

    if (!invite || invite.expiresAt < new Date()) {
      return errorResponse('You must have a valid invitation to join this platform.', 'INVITE_REQUIRED', 403)
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return errorResponse('Email already exists', 'EMAIL_EXISTS', 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // 2. Transactional User Creation + Optional Auto-Accept
    const user = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
          globalRole: null
        })
        .returning()

      // If token matches this invite specifically, accept it now
      if (invite_token && invite.token === invite_token) {
        await tx.insert(tenantMembers).values({
          tenantId: invite.tenantId,
          userId: u.id,
          role: invite.role,
        })
        await tx.update(invitations).set({ status: 'ACCEPTED' }).where(eq(invitations.id, invite.id))
        await tx.insert(auditLogs).values({
            actorUserId: u.id,
            targetUserEmail: email,
            tenantId: invite.tenantId,
            action: 'INVITE_ACCEPTED',
            metadata: { autoAccepted: true }
        })
      }

      return u
    })

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const sessionToken = await encrypt({ 
        userId: user.id, 
        globalRole: user.globalRole as 'SUPER_ADMIN' | null, 
        expiresAt 
    })

    const response = successResponse({
      user: { 
          id: user.id, 
          email: user.email,
          name: user.name,
          globalRole: user.globalRole
      } 
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
