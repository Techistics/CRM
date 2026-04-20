import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { notifications } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const readSchema = z.object({
  notificationId: z.string().min(1)
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = readSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('notificationId is required', 'VALIDATION_ERROR', 400)
    }

    const { notificationId } = parsed.data

    if (notificationId === 'all') {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, ctx.dbUserId),
            eq(notifications.tenantId, ctx.tenant.id),
          ),
        )
    } else {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, ctx.dbUserId),
            eq(notifications.tenantId, ctx.tenant.id),
          ),
        )
    }

    return successResponse({ ok: true })
  })
}
