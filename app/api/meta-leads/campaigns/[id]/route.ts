import { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { metaConnections, metaFormMappings, tenantMembers } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'

const assignmentSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = assignmentSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { id } = await params
    const [mapping] = await db
      .select({
        id: metaFormMappings.id,
        connectionId: metaFormMappings.connectionId,
      })
      .from(metaFormMappings)
      .innerJoin(
        metaConnections,
        and(
          eq(metaFormMappings.connectionId, metaConnections.id),
          eq(metaConnections.tenantId, ctx.tenant.id),
        ),
      )
      .where(eq(metaFormMappings.id, id))
      .limit(1)

    if (!mapping) {
      return errorResponse('Campaign mapping not found', 'NOT_FOUND', 404)
    }

    if (parsed.data.assigneeId) {
      const [member] = await db
        .select({ userId: tenantMembers.userId })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.userId, parsed.data.assigneeId),
            isNull(tenantMembers.deletedAt),
          ),
        )
        .limit(1)

      if (!member) {
        return errorResponse('Assignee must be an active tenant member', 'INVALID_ASSIGNEE', 400)
      }
    }

    await db
      .update(metaFormMappings)
      .set({ assigneeId: parsed.data.assigneeId })
      .where(
        and(
          eq(metaFormMappings.id, mapping.id),
          eq(metaFormMappings.connectionId, mapping.connectionId),
        ),
      )

    return successResponse({ updated: true })
  })
}
