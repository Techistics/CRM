import { tenants } from '@/db/schema'
import { eq as eqOp } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { users, invitations, tenantMembers, auditLogs } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { getCredentialVersionForSession } from '@/lib/session-credential'
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
    let invite: typeof invitations.$inferSelect | undefined

    if (invite_token) {
      const [i] = await db
        .select()
        .from(invitations)
        .where(and(
          eq(invitations.token, invite_token),
          eq(invitations.status, 'PENDING')
        ))
        .limit(1)
      invite = i
      
      // Verify email matches if token is used (security)
      if (invite && invite.email.toLowerCase() !== email) {
        return errorResponse('This invitation is for a different email address.', 'EMAIL_MISMATCH', 403)
      }
    } else {
      const [i] = await db
        .select()
        .from(invitations)
        .where(and(
          sql`lower(${invitations.email}) = ${email}`, 
          eq(invitations.status, 'PENDING')
        ))
        .limit(1)
      invite = i
    }

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

      // 2. Transactional User Creation + Auto-Accept Invitation
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

        // If we found a valid invitation for this email, accept it now
        if (invite) {
  await tx.insert(tenantMembers).values({
    tenantId: invite.tenantId,
    userId: u.id,
    role: invite.role,
    tenantPassword: hashedPassword,
  })
          await tx.update(invitations).set({ status: 'ACCEPTED' }).where(eq(invitations.id, invite.id))
          await tx.insert(auditLogs).values({
            actorUserId: u.id,
            targetUserEmail: email,
            tenantId: invite.tenantId,
            action: 'INVITE_ACCEPTED',
            metadata: { autoAccepted: true, tokenUsed: !!invite_token }
          })
        }

        return u
      })

    const [tenantRow] = await db
  .select({ slug: tenants.slug })
  .from(tenants)
  .where(eq(tenants.id, invite.tenantId))
  .limit(1)

const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
const credentialVersion = await getCredentialVersionForSession({
  userId: user.id,
  tenantId: invite.tenantId,
})
const sessionToken = await encrypt({
  userId: user.id,
  globalRole: null,
  tenantId: invite.tenantId,
  tenantSlug: tenantRow.slug,
  role: invite.role as 'ADMIN' | 'PRO',
  expiresAt,
  credentialVersion,
})

const response = successResponse({
  user: { id: user.id, email: user.email, name: user.name, globalRole: null },
  tenantSlug: tenantRow.slug,
  role: invite.role,
})
    response.cookies.set('session', '', { expires: new Date(0), path: '/' })
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
