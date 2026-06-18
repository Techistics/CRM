import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { db } from '@/db'
import { invitations, tenants, users, tenantMembers } from '@/db/schema'
import { encrypt, decrypt } from '@/lib/auth'
import { getCredentialVersionForSession } from '@/lib/session-credential'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const newUserAcceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z.string().min(8),
})

const existingUserAcceptSchema = z.object({
  token: z.string().min(1),
  existingUserAccept: z.literal(true),
})

function workspaceRedirectUrl(tenantSlug: string, role: string) {
  const base = `/t/${tenantSlug}`
  return role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`
}

async function buildSessionResponse(
  req: NextRequest,
  userId: string,
  tenantId: string,
  tenantSlug: string,
  role: string,
  email: string,
) {
  const sessionCookie = req.cookies.get('session')?.value
  let hasActiveSession = false
  let redirectUrl = `/sign-in?email=${encodeURIComponent(email)}`

  if (sessionCookie) {
    const session = await decrypt(sessionCookie)
    if (session && session.userId === userId) {
      hasActiveSession = true
      redirectUrl = workspaceRedirectUrl(tenantSlug, role)
    }
  }

  const response = successResponse({
    tenantSlug,
    role,
    redirectUrl,
    hasActiveSession,
  })

  if (hasActiveSession) {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const credentialVersion = await getCredentialVersionForSession({ userId, tenantId })
    const sessionToken = await encrypt({
      globalRole: null,
      userId,
      tenantId,
      role: role as 'ADMIN' | 'PRO',
      tenantSlug,
      expiresAt,
      credentialVersion,
    })

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
  }

  return response
}

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) return errorResponse('Token required', 'MISSING_TOKEN', 400)

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

    const baseFields = {
      email: row.email,
      role: row.role,
      workspaceName: row.tenantName,
      tenantSlug: row.tenantSlug,
      inviterName: row.inviterName ?? 'A team member',
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, row.email))
      .limit(1)

    if (!existingUser) {
      return successResponse({
        existingUser: false,
        ...baseFields,
        expiresAt: row.expiresAt,
      })
    }

    let hasActiveSession = false
    const sessionCookie = req.cookies.get('session')?.value
    if (sessionCookie) {
      const session = await decrypt(sessionCookie)
      if (session && session.userId === existingUser.id) {
        hasActiveSession = true
      }
    }

    const redirectUrl = hasActiveSession
      ? workspaceRedirectUrl(row.tenantSlug, row.role)
      : `/sign-in?email=${encodeURIComponent(row.email)}`

    return successResponse({
      existingUser: true,
      hasActiveSession,
      redirectUrl,
      ...baseFields,
    })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 'INVALID_JSON', 400)

    const existingParsed = existingUserAcceptSchema.safeParse(body)
    if (existingParsed.success) {
      return acceptExistingUser(req, existingParsed.data.token)
    }

    const newUserParsed = newUserAcceptSchema.safeParse(body)
    if (!newUserParsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    return acceptNewUser(req, newUserParsed.data)
  })
}

async function acceptExistingUser(req: NextRequest, token: string) {
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1)

  if (!invite) return errorResponse('Invitation not found', 'NOT_FOUND', 404)

  if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return errorResponse('Invitation expired or already used', 'GONE', 410)
  }

  const result = await db.transaction(async (tx) => {
    const [accepted] = await tx
      .update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'PENDING')))
      .returning()

    if (!accepted) {
      return { ok: false as const }
    }

    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1)

    if (!existingUser) {
      return { ok: false as const, reason: 'NOT_EXISTING_USER' as const }
    }

    await tx
      .insert(tenantMembers)
      .values({
        tenantId: invite.tenantId,
        userId: existingUser.id,
        role: invite.role,
        customRoleId: invite.customRoleId,
      })
      .onConflictDoNothing()

    const [tenant] = await tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, invite.tenantId))
      .limit(1)

    return {
      ok: true as const,
      targetUser: existingUser,
      tenantSlug: tenant?.slug ?? '',
    }
  })

  if (!result.ok) {
    if ('reason' in result && result.reason === 'NOT_EXISTING_USER') {
      return errorResponse('No account found for this invitation', 'NOT_EXISTING_USER', 400)
    }
    return errorResponse('Invitation already used', 'GONE', 410)
  }

  return buildSessionResponse(
    req,
    result.targetUser.id,
    invite.tenantId,
    result.tenantSlug,
    invite.role,
    invite.email,
  )
}

async function acceptNewUser(
  req: NextRequest,
  data: z.infer<typeof newUserAcceptSchema>,
) {
  const { token, name, password } = data

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

  const result = await db.transaction(async (tx) => {
    const [accepted] = await tx
      .update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'PENDING')))
      .returning()

    if (!accepted) {
      return { ok: false as const }
    }

    const existingUsers = await tx
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1)
    let targetUser = existingUsers[0]

    if (!targetUser) {
      const [created] = await tx
        .insert(users)
        .values({ email: invite.email, name, password: hashedPassword })
        .returning()
      targetUser = created
    } else {
      await tx
        .update(users)
        .set({ name, password: hashedPassword })
        .where(eq(users.id, targetUser.id))
    }

    await tx
      .insert(tenantMembers)
      .values({
        tenantId: invite.tenantId,
        userId: targetUser.id,
        role: invite.role,
        tenantPassword: hashedPassword,
        customRoleId: invite.customRoleId,
      })
      .onConflictDoNothing()

    const [tenant] = await tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, invite.tenantId))
      .limit(1)

    return {
      ok: true as const,
      targetUser,
      tenantSlug: tenant?.slug ?? '',
    }
  })

  if (!result.ok) {
    return errorResponse('Invitation already used', 'GONE', 410)
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const credentialVersion = await getCredentialVersionForSession({
    userId: result.targetUser.id,
    tenantId: invite.tenantId,
  })
  const sessionToken = await encrypt({
    userId: result.targetUser.id,
    globalRole: null,
    tenantId: invite.tenantId,
    tenantSlug: result.tenantSlug,
    role: invite.role as 'ADMIN' | 'PRO',
    expiresAt,
    credentialVersion,
  })

  const response = successResponse({
    tenantSlug: result.tenantSlug,
    role: invite.role,
    redirectUrl: workspaceRedirectUrl(result.tenantSlug, invite.role),
    hasActiveSession: true,
  })

  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return response
}
