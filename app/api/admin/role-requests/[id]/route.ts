import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { roleRequests, tenantMembers, users } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getSession } from '@/lib/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const roleDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject'])
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const session = await getSession()
    if (!session) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const { id } = await params
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return errorResponse('Invalid JSON', 'INVALID_JSON', 400)
    }

    const parsed = roleDecisionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return errorResponse('Decision must be approve or reject', 'VALIDATION_ERROR', 400)
    }

    const { decision } = parsed.data

    const [row] = await db
      .select()
      .from(roleRequests)
      .where(eq(roleRequests.id, id))
    
    if (!row || row.status !== 'PENDING') {
      return errorResponse('Request not found or already handled', 'NOT_FOUND', 404)
    }

    if (row.tenantId && row.tenantId !== ctx.tenant.id) {
      return errorResponse('Forbidden', 'FORBIDDEN', 403)
    }

    const now = new Date()

    if (decision === 'reject') {
      await db
        .update(roleRequests)
        .set({
          status: 'REJECTED',
          reviewedAt: now,
          reviewedBy: session.userId,
        })
        .where(eq(roleRequests.id, id))
      return successResponse({ ok: true })
    }

    // Approval logic
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, row.userId as string), 
    })

    if (!user) {
      return errorResponse('User not found', 'USER_NOT_FOUND', 404)
    }

    try {
      await db.insert(tenantMembers).values({
        tenantId: ctx.tenant.id,
        userId: user.id,
        role: row.requestedRole as 'ADMIN' | 'PRO',
      })
    } catch (e) {
      console.error('[ROLE_APPROVAL_INSERT_ERROR]', e)
      return errorResponse(
        'Could not add user to workspace. They may already be a member.',
        'SUBMISSION_ERROR'
      )
    }

    await db
      .update(roleRequests)
      .set({
        status: 'APPROVED',
        reviewedAt: now,
        reviewedBy: session.userId,
        tenantId: row.tenantId ?? ctx.tenant.id,
      })
      .where(eq(roleRequests.id, id))

    return successResponse({ ok: true })
  })
}
