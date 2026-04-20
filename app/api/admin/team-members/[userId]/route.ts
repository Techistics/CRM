import { and, count, eq, isNull } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { tenantMembers, auditLogs, users } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { roleUpdateSchema } from '@/lib/validators/auth'

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
    const ctx = await requireTenantAdminApi()
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

    const { role } = parsed.data

    // Ownership Check: Creator cannot be downgraded
    if (userId === ctx.tenant.createdBy && role !== 'ADMIN') {
      return errorResponse('The workspace creator must remain an ADMIN.', 'OWNER_PROTECTED', 403)
    }

    const [member] = await db
      .select({
        userId: tenantMembers.userId,
        currentRole: tenantMembers.role,
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

    if (member.currentRole === 'ADMIN' && role !== 'ADMIN') {
      const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
      if (lastAdminCheck) return lastAdminCheck
    }

    await db
      .update(tenantMembers)
      .set({ role: role as TeamRole })
      .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))

    // Audit Log
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      tenantId: ctx.tenant.id,
      action: 'ROLE_CHANGED',
      metadata: { targetUserId: userId, from: member.currentRole, to: role }
    })

    return successResponse({ ok: true })
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { userId } = await params

    // Ownership Check: Creator cannot be removed
    if (userId === ctx.tenant.createdBy) {
      return errorResponse('The workspace creator cannot be removed from the workspace.', 'OWNER_PROTECTED', 403)
    }

    const [member] = await db
      .select({
        userId: tenantMembers.userId,
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

    const lastAdminCheck = await ensureNotLastAdmin(ctx.tenant.id, userId)
    if (lastAdminCheck) return lastAdminCheck

    // Soft Delete
    await db
      .update(tenantMembers)
      .set({ deletedAt: new Date() })
      .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))

    // Audit Log
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      tenantId: ctx.tenant.id,
      action: 'ROLE_CHANGED',
      metadata: { targetUserId: userId, action: 'removed' }
    })

    return successResponse({ ok: true })
  })
}
