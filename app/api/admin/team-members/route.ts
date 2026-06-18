import { NextRequest } from 'next/server'
import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { users, tenantMembers, invitations, auditLogs, leads } from '@/db/schema'
import { requirePermissionApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { sendInviteEmail } from '@/lib/mail'
import crypto from 'crypto'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { teamInviteSchema, teamResendSchema } from '@/lib/validators/auth'
import { validateCustomRoleId } from '@/lib/validate-custom-role'
import { createInvitationAndSendEmail } from '@/lib/invitations/service';
import { getRootOrigin } from '@/lib/public-url';

const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    // Fetch Members with active lead count
    const members = await db
      .select({
        userId: tenantMembers.userId,
        name: users.name,
        email: users.email,
        role: tenantMembers.role,
        activeLeadCount: sql<number>`cast(count(${leads.id}) as integer)`,
      })
      .from(tenantMembers)
      .innerJoin(users, eq(tenantMembers.userId, users.id))
      .leftJoin(
        leads,
        and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.assignedTo, tenantMembers.userId),
          sql`${leads.stage} not in ('paid', 'lost')`,
        ),
      )
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenant.id),
          isNull(tenantMembers.deletedAt)
        )
      )
      .groupBy(tenantMembers.userId, users.name, users.email, tenantMembers.role)

    // Fetch Pending Invitations
    const pendingInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, ctx.tenant.id),
          eq(invitations.status, 'PENDING')
        )
      )

    return successResponse({
      members,
      invitations: pendingInvitations,
    })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    // Rate Limiting Logic
    const now = Date.now()
    const limitInfo = rateLimitMap.get(ctx.dbUserId) || { count: 0, lastReset: now }
    if (now - limitInfo.lastReset > 60000) {
      limitInfo.count = 0
      limitInfo.lastReset = now
    }
    if (limitInfo.count >= 5) {
      return errorResponse('Too many requests. Please wait a minute.', 'RATE_LIMIT', 429)
    }
    limitInfo.count++
    rateLimitMap.set(ctx.dbUserId, limitInfo)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON', 'INVALID_JSON', 400)
    }

    const parsed = teamInviteSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { email: rawEmail, role, customRoleId } = parsed.data
    const email = rawEmail.toLowerCase().trim()
    const roleError = await validateCustomRoleId(ctx.tenant.id, role, customRoleId)
    if (roleError) return errorResponse(roleError, 'INVALID_CUSTOM_ROLE', 400)
    const resolvedCustomRoleId = role === 'PRO' ? (customRoleId ?? null) : null

    // 1. Find user by email (case-insensitive)
    const [userInDb] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1)

    if (userInDb) {
      // Check for EXISTING membership (including deleted)
      const [existing] = await db
        .select()
        .from(tenantMembers)
        .where(and(
          eq(tenantMembers.tenantId, ctx.tenant.id),
          eq(tenantMembers.userId, userInDb.id)
        ))
        .limit(1)

      if (existing) {
        if (!existing.deletedAt) {
          return errorResponse(
            'User is already a member of this workspace',
            'ALREADY_MEMBER',
            400,
          )
        }
      }
    }

    // Check for existing valid pending invitation
    const [existingInvite] = await db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.tenantId, ctx.tenant.id),
        eq(invitations.email, email),
        eq(invitations.status, 'PENDING')
      ))
      .limit(1)

    if (existingInvite && existingInvite.expiresAt > new Date()) {
      return errorResponse('A valid invitation is already pending for this email', 'INVITE_PENDING', 400)
    }

    // Use service to create invitation and send email
    const { invitationId, token, emailSent } = await createInvitationAndSendEmail({
      tenantId: ctx.tenant.id,
      tenantSlug: ctx.tenant.slug,
      tenantName: ctx.tenant.name,
      email,
      role: role as 'ADMIN' | 'PRO',
      customRoleId: resolvedCustomRoleId,
      invitedBy: ctx.dbUserId,
    })

    // Audit Log (preserve existing behavior)
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      targetUserEmail: email,
      tenantId: ctx.tenant.id,
      action: 'INVITE_SENT',
      metadata: { role, invitationId },
    })

    // Build invite link using legacy path
    const rootOrigin = getRootOrigin()
    const inviteLink = `${rootOrigin}/invite/accept?token=${token}`
    const workspaceUrl = `${rootOrigin}/t/${ctx.tenant.slug}`

    // Email already sent by service; if service reported failure, log warning
    if (!emailSent) {
      console.error('[invite] email send failed', { invitationId, tenantId: ctx.tenant.id, email })
    }

    if (!emailSent) {
      return successResponse({ 
        ok: true, 
        warning: 'Invitation created but email failed to send. Please check Resend configuration.',
        email,
        role
      })
    }

    return successResponse({
      email,
      role,
      status: 'PENDING',
    })
  })
}

export async function PATCH(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON', 'INVALID_JSON', 400)
    }

    const parsed = teamResendSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { email: rawEmail, role } = parsed.data
    const email = rawEmail.toLowerCase().trim()

    // Find existing invitation (Pending or Expired)
    const [invite] = await db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.tenantId, ctx.tenant.id),
        eq(invitations.email, email),
        inArray(invitations.status, ['PENDING', 'EXPIRED'])
      ))
      .limit(1)

    if (!invite) {
      return errorResponse('No pending invitation found for this email', 'NOT_FOUND', 404)
    }

    // Regenerate token and update expiry
    const newToken = crypto.randomBytes(32).toString('hex')
    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    await db.update(invitations)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
        invitedBy: ctx.dbUserId,
        role: role ?? invite.role, // Update role if provided, otherwise keep existing
        status: 'PENDING' // Reset status to PENDING in case it was EXPIRED
      })
      .where(eq(invitations.id, invite.id))

    // Audit Log
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      targetUserEmail: email,
      tenantId: ctx.tenant.id,
      action: 'INVITE_SENT',
      metadata: { resend: true, invitationId: invite.id }
    })

    // Resend Email
    const rootOrigin = getRootOrigin()
    const inviteLink = `${rootOrigin}/accept-invite?token=${newToken}`
    const workspaceUrl = `${rootOrigin}/t/${ctx.tenant.slug}`
    
    const emailRes = await sendInviteEmail({
      email,
      tenantName: ctx.tenant.name,
      inviteLink,
      workspaceUrl,
    })

    if (!emailRes.success) {
      return successResponse({ 
        ok: true, 
        warning: 'Token updated but email failed to send.',
        email,
      })
    }

    return successResponse({ message: 'Invitation resent' })
  })
}
