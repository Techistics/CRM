import { NextRequest } from 'next/server'
import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { users, tenantMembers, invitations, auditLogs, leads } from '@/db/schema'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { sendInviteEmail } from '@/lib/mail'
import crypto from 'crypto'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { teamInviteSchema, teamResendSchema } from '@/lib/validators/auth'
import { getRootOrigin } from '@/lib/public-url'

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
    const ctx = await requireTenantAdminApi()
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

    const { email: rawEmail, role } = parsed.data
    const email = rawEmail.toLowerCase().trim()

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
        // Option A: If already active, sync the role and "resend" a link
        if (!existing.deletedAt) {
          // If the role selected in the dialog is different, UPDATE IT
          if (role && role !== existing.role) {
            await db.update(tenantMembers)
              .set({ role: role as 'ADMIN' | 'PRO' })
              .where(eq(tenantMembers.id, existing.id))
            
            // Audit Log for role change
            await db.insert(auditLogs).values({
              actorUserId: ctx.dbUserId,
              targetUserEmail: userInDb.email,
              tenantId: ctx.tenant.id,
              action: 'ROLE_CHANGED',
              metadata: { from: existing.role, to: role }
            })
          }

          const rootOrigin = getRootOrigin()
          const targetPath = (role ?? existing.role) === 'ADMIN' ? 'admin/overview' : 'pro/overview'
          const loginLink = `${rootOrigin}/t/${ctx.tenant.slug}/${targetPath}`
          const workspaceUrl = `${rootOrigin}/t/${ctx.tenant.slug}`
          
          await sendInviteEmail({
            email: userInDb.email,
            tenantName: ctx.tenant.name,
            inviteLink: loginLink,
            workspaceUrl,
          })

          return successResponse({
            message: `User is already a member. We have updated their role to ${role ?? existing.role} and resent their link.`,
            email: userInDb.email,
            role: role ?? existing.role,
            status: 'ACTIVE'
          })
        }

        // Option B: If soft-deleted, RESTORE them
        await db.update(tenantMembers)
          .set({ deletedAt: null, role: role as 'ADMIN' | 'PRO' })
          .where(eq(tenantMembers.id, existing.id))

        // Send Link
        const rootOrigin = getRootOrigin()
        const targetPath = role === 'ADMIN' ? 'admin/overview' : 'pro/overview'
        const loginLink = `${rootOrigin}/t/${ctx.tenant.slug}/${targetPath}`
        const workspaceUrl = `${rootOrigin}/t/${ctx.tenant.slug}`
        
        await sendInviteEmail({
          email: userInDb.email,
          tenantName: ctx.tenant.name,
          inviteLink: loginLink,
          workspaceUrl,
        })

        return successResponse({
          message: 'Member restored and link sent.',
          email: userInDb.email,
          role,
          status: 'ACTIVE'
        })
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

    // Create invitation with secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    await db.insert(invitations).values({
      tenantId: ctx.tenant.id,
      email,
      role: role as 'ADMIN' | 'PRO',
      token,
      expiresAt,
      invitedBy: ctx.dbUserId,
      status: 'PENDING',
    })

    // Audit Log
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      targetUserEmail: email,
      tenantId: ctx.tenant.id,
      action: 'INVITE_SENT',
      metadata: { role, expiresAt }
    })

    // Send Email Link (Main Domain)
    const rootOrigin = getRootOrigin()
    const inviteLink = `${rootOrigin}/accept-invite?token=${token}`
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
    const ctx = await requireTenantAdminApi()
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
      metadata: { resend: true, oldToken: invite.token, newToken }
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
