import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users, tenantMembers, auditLogs } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    const { userId } = await params

    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return errorResponse('New password must be at least 8 characters', 'INVALID_PASSWORD', 400)
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    const [membership] = await db
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))
      .limit(1)

    if (!membership) {
      return errorResponse('Member not found', 'NOT_FOUND', 404)
    }
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId))
    await db.update(tenantMembers).set({ tenantPassword: hashed }).where(and(eq(tenantMembers.tenantId, ctx.tenant.id), eq(tenantMembers.userId, userId)))
    await db.insert(auditLogs).values({
      actorUserId: ctx.dbUserId,
      tenantId: ctx.tenant.id,
      action: 'ROLE_CHANGED',
      metadata: { targetUserId: userId, action: 'ADMIN_RESET_PASSWORD' },
    })

    return successResponse({ ok: true })
  })
}
