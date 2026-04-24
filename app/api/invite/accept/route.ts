import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { db } from '@/db'
import { invitations, tenants, users, tenantMembers } from '@/db/schema'
import { encrypt } from '@/lib/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z.string().min(8),
})

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) return errorResponse('Token required', 'MISSING_TOKEN', 400)

    // Manual join since I haven't verified all relations in schema.ts
    const [row] = await db
      .select({
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        status: invitations.status,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        inviterName: users.name,
      })
      .from(invitations)
      .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
      .leftJoin(users, eq(users.id, invitations.invitedBy))
      .where(eq(invitations.token, token))
      .limit(1)

    if (!row) return errorResponse('Invitation not found', 'NOT_FOUND', 404)

    if (row.status !== 'PENDING' || row.expiresAt < new Date()) {
      return errorResponse('Invitation expired or already used', 'GONE', 410)
    }

    return successResponse({
      email: row.email,
      role: row.role,
      workspaceName: row.tenantName,
      tenantSlug: row.tenantSlug,
      inviterName: row.inviterName ?? 'A team member',
      expiresAt: row.expiresAt,
    })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 'INVALID_JSON', 400)

    const parsed = acceptSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)

    const { token, name, password } = parsed.data

    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1)

    if (!invite) return errorResponse('Invitation not found', 'NOT_FOUND', 404)

    if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return errorResponse('Invitation expired or already used', 'GONE', 410)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: invite.email,
        name,
        password: hashedPassword,
      })
      .returning()

    // 2. Add to tenant
    await db.insert(tenantMembers).values({
      tenantId: invite.tenantId,
      userId: newUser.id,
      role: invite.role,
    })

    // 3. Update invitation
    await db
      .update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(invitations.id, invite.id))

    // 4. Get tenant slug for redirect
    const [tenant] = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, invite.tenantId))
      .limit(1)

    // 5. Create Session
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const sessionToken = await encrypt({
      userId: newUser.id,
      globalRole: null,
      expiresAt,
    })

    const response = successResponse({ 
      success: true, 
      tenantSlug: tenant.slug 
    })

    response.cookies.set({
      name: 'session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return response
  })
}
