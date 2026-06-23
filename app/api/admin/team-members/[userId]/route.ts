import { and, count, eq, isNull, isNotNull } from 'drizzle-orm'
import { NextRequest } from 'next/server'

import { db } from '@/db'
import { tenantMembers, auditLogs, users, leads, customRoles } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { roleUpdateSchema } from '@/lib/validators/auth'
import { validateCustomRoleId } from '@/lib/validate-custom-role'
import {
  validateTeamMemberRemoveForActor,
  validateTeamMemberUpdateForActor,
} from '@/lib/team-access'
import { sendUnassignedLeadsAlertEmail } from '@/lib/mail'
import { getRootOrigin } from '@/lib/public-url'

type TeamRole = 'ADMIN' | 'PRO'

async function ensureNotLastAdmin(tenantId: string, targetUserId: string) {
  const [target] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, targetUserId),
        isNull(tenantMembers.deletedAt)
      ),
    )

  if (target?.role !== 'ADMIN') return null

  const [admins] = await db
    .select({ c: count() })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'ADMIN'),
        isNull(tenantMembers.deletedAt)
      ),
    )

  if (Number(admins?.c ?? 0) <= 1) {
    return errorResponse('Workspace must keep at least one admin', 'LAST_ADMIN', 400)
  }

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    const { userId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON', 'INVALID_JSON', 400)
    }

    const parsed = roleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid role', 'INVALID_ROLE', 400)
    }

    const { role, customRoleId } = parsed.data
    const email = (body as { email?: string })?.email?.trim()
    const roleError = await validateCustomRoleId(ctx.tenant.id, role, customRoleId)
    if (roleError) return errorResponse(roleError, 'INVALID_CUSTOM_ROLE', 400)
    const resolvedCustomRoleId = role === 'PRO' ? (customRoleId ?? null) : null

    // Ownership Check: Creator cannot be downgraded
    if (userId === ctx.tenant.createdBy && role !== 'ADMIN') {
      return errorResponse('The workspace creator must remain an ADMIN.', 'OWNER_PROTECTED', 403)
    }

    const [member] = await db
      .select({
        userId: tenantMembers.userId,
        currentRole: tenantMembers.role,
        customRoleId: tenantMembers.customRoleId,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenant.id), 
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt)
        ),
      )
      .limit(1)

    if (!member) {
      return errorResponse('Member not found', 'NOT_FOUND', 404)
    }

    const updateError = validateTeamMemberUpdateForActor(
      ctx.role,
      member.currentRole as TeamRole,
      role as TeamRole,
      resolvedCustomRoleId,
      member.customRoleId,
    )
    if (updateError) return errorResponse(updateError, 'FORBIDDEN', 403)

    if (member.currentRole === 'ADMIN' && role !== 'ADMIN') {
      const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
      if (lastAdminCheck) return lastAdminCheck
    }

    await db
      .update(tenantMembers)
      .set({
        role: role as TeamRole,
        customRoleId: resolvedCustomRoleId,
      })
      .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))
      if (email) {
        await db.update(users).set({ email }).where(eq(users.id, userId))
      }

    // Audit Log
    await db.insert(auditLogs).values({
        actorUserId: ctx.dbUserId,
        tenantId: ctx.tenant.id,
        action: 'ROLE_CHANGED',
        metadata: {
          targetUserId: userId,
          from: member.currentRole,
          to: role,
          customRoleId: resolvedCustomRoleId,
        },
      })

    return successResponse({ ok: true })
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    const { userId } = await params

    // Ownership Check: Creator cannot be removed
    if (userId === ctx.tenant.createdBy) {
      return errorResponse('The workspace creator cannot be removed from the workspace.', 'OWNER_PROTECTED', 403)
    }

    const [member] = await db
      .select({
        userId: tenantMembers.userId,
        role: tenantMembers.role,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenant.id), 
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt)
        ),
      )
      .limit(1)

    if (!member) {
      return errorResponse('Member not found', 'NOT_FOUND', 404)
    }

    const removeError = validateTeamMemberRemoveForActor(
      ctx.role,
      member.role as TeamRole,
    )
    if (removeError) return errorResponse(removeError, 'FORBIDDEN', 403)

    const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
    if (lastAdminCheck) return lastAdminCheck

    // Fetch removed member name for email (before soft-delete so member is still visible)
    const [removedUser] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // Count leads that will become unassigned (query before nullification for accurate count)
    const [{ unassignedCount }] = await db
      .select({ unassignedCount: count() })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.assignedTo, userId),
          isNull(leads.deletedAt),
        ),
      )

    // Soft Delete
    await db
      .update(tenantMembers)
      .set({ deletedAt: new Date() })
      .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))

    // Explicitly nullify assignedTo so unassigned filter works immediately (soft-delete doesn't trigger FK cascade)
    await db
      .update(leads)
      .set({ assignedTo: null })
      .where(
        and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.assignedTo, userId),
          isNull(leads.deletedAt),
        ),
      )

    // Audit Log
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      tenantId: ctx.tenant.id,
      action: 'ROLE_CHANGED',
      metadata: { targetUserId: userId, action: 'removed' }
    })

    // Send unassigned leads alert emails if there are affected leads
    if (Number(unassignedCount) > 0) {
      const leadsUrl = `${getRootOrigin()}/t/${ctx.tenant.slug}/leads?assignedTo=unassigned`
      const removedMemberName = removedUser?.name ?? 'A team member'

      // Fetch all active admins
      const adminRecipients = await db
        .select({ email: users.email, name: users.name })
        .from(tenantMembers)
        .innerJoin(users, eq(tenantMembers.userId, users.id))
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.role, 'ADMIN'),
            isNull(tenantMembers.deletedAt),
          ),
        )

      // Fetch active PROs with a custom role that has leads.assign permission
      const proMembers = await db
        .select({ email: users.email, name: users.name, permissions: customRoles.permissions })
        .from(tenantMembers)
        .innerJoin(users, eq(tenantMembers.userId, users.id))
        .innerJoin(customRoles, eq(tenantMembers.customRoleId, customRoles.id))
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.role, 'PRO'),
            isNull(tenantMembers.deletedAt),
            isNotNull(tenantMembers.customRoleId),
          ),
        )

      const proRecipientsWithPermission = proMembers.filter((m) => {
        const perms = Array.isArray(m.permissions) ? m.permissions : []
        return perms.includes('leads.assign')
      })

      // Deduplicate and exclude the removed member themselves
      const allRecipients = [
        ...adminRecipients,
        ...proRecipientsWithPermission.map((p) => ({ email: p.email, name: p.name })),
      ].filter(
        (r, index, self) =>
          r.email !== removedUser?.email &&
          self.findIndex((x) => x.email === r.email) === index,
      )

      // Fire-and-forget — email failures must never block member removal
      Promise.allSettled(
        allRecipients.map((recipient) =>
          sendUnassignedLeadsAlertEmail({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            removedMemberName,
            unassignedCount: Number(unassignedCount),
            workspaceName: ctx.tenant.name,
            leadsUrl,
          }),
        ),
      ).catch(() => { /* silently swallow — removal already succeeded */ })
    }

    return successResponse({ ok: true })
  })
}
