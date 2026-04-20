import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { roleRequests, users } from '@/db/schema'
import { requireTenantFromApiHeaders } from '@/lib/tenant-api'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { getSession } from '@/lib/auth'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const roleRequestSchema = z.object({
  requestedRole: z.enum(['ADMIN', 'PRO'])
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const session = await getSession()
    if (!session) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const { userId } = session

    const t = await requireTenantFromApiHeaders()
    if (!t.ok) return t.response

    const actor = await resolveTenantAccess(userId, t.tenant)
    if (actor) {
      return errorResponse('You already have access to this workspace', 'ALREADY_MEMBER', 400)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = roleRequestSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid role requested', 'VALIDATION_ERROR', 400)
    }

    const { requestedRole } = parsed.data

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    })

    if (!user) {
      return errorResponse('User profile not found', 'NOT_FOUND', 404)
    }

    const [existingPending] = await db
      .select()
      .from(roleRequests)
      .where(
        and(
          eq(roleRequests.userId, userId),
          eq(roleRequests.status, 'PENDING'),
          eq(roleRequests.tenantId, t.tenant.id),
        ),
      )
      .limit(1)

    if (existingPending) {
      return errorResponse('You already have a pending request', 'PENDING_EXISTS', 400)
    }

    await db.insert(roleRequests).values({
      tenantId: t.tenant.id,
      userId: userId,
      email: user.email,
      name: user.name,
      requestedRole: requestedRole,
      status: 'PENDING',
    })

    return successResponse({ ok: true })
  })
}
