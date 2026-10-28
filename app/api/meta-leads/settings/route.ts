import { NextRequest } from 'next/server'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { metaConnections, tenantMembers, users } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const connections = await db
      .select({
        pageName: metaConnections.pageName,
        status: metaConnections.status,
        autoAssign: metaConnections.autoAssign,
        defaultAssigneeId: metaConnections.defaultAssigneeId,
        defaultAssigneeName: users.name,
      })
      .from(metaConnections)
      .leftJoin(users, eq(metaConnections.defaultAssigneeId, users.id))
      .where(eq(metaConnections.tenantId, ctx.tenant.id))
      .orderBy(asc(metaConnections.createdAt), asc(metaConnections.id))

    const connection = connections.find((row) => row.status === 'active') ?? connections[0]

    return successResponse({
      connected: connections.some((row) => row.status === 'active'),
      pageName: connection?.pageName ?? null,
      autoAssign: connection?.autoAssign ?? false,
      defaultAssigneeId: connection?.defaultAssigneeId ?? null,
      defaultAssigneeName: connection?.defaultAssigneeName ?? null,
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
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse('Expected a settings object', 'VALIDATION_ERROR', 400)
    }

    const settings = body as Record<string, unknown>
    const hasAutoAssign = Object.prototype.hasOwnProperty.call(settings, 'autoAssign')
    const hasAssignee = Object.prototype.hasOwnProperty.call(settings, 'defaultAssigneeId')

    if (!hasAutoAssign && !hasAssignee) {
      return errorResponse('No settings provided', 'VALIDATION_ERROR', 400)
    }
    if (hasAutoAssign && typeof settings.autoAssign !== 'boolean') {
      return errorResponse('autoAssign must be a boolean', 'VALIDATION_ERROR', 400)
    }

    const defaultAssigneeId = settings.defaultAssigneeId
    if (
      hasAssignee &&
      defaultAssigneeId !== null &&
      (typeof defaultAssigneeId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(defaultAssigneeId))
    ) {
      return errorResponse('defaultAssigneeId must be a user ID or null', 'VALIDATION_ERROR', 400)
    }

    if (typeof defaultAssigneeId === 'string') {
      const [member] = await db
        .select({ userId: tenantMembers.userId })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, ctx.tenant.id),
            eq(tenantMembers.userId, defaultAssigneeId),
            isNull(tenantMembers.deletedAt),
          ),
        )
        .limit(1)

      if (!member) {
        return errorResponse('Default assignee must be an active tenant member', 'INVALID_ASSIGNEE', 400)
      }
    }

    const existingConnections = await db
      .select({
        autoAssign: metaConnections.autoAssign,
        defaultAssigneeId: metaConnections.defaultAssigneeId,
      })
      .from(metaConnections)
      .where(eq(metaConnections.tenantId, ctx.tenant.id))

    const nextAutoAssign = hasAutoAssign ? settings.autoAssign : undefined
    const nextAssigneeId = hasAssignee ? (defaultAssigneeId as string | null) : undefined
    const hasInvalidAutoAssign = existingConnections.some((connection) => {
      const autoAssign = nextAutoAssign ?? connection.autoAssign
      const assigneeId = hasAssignee ? nextAssigneeId : connection.defaultAssigneeId
      return autoAssign && !assigneeId
    })

    if (
      hasInvalidAutoAssign ||
      (existingConnections.length === 0 && nextAutoAssign === true && !nextAssigneeId)
    ) {
      return errorResponse(
        'A default assignee is required when autoAssign is enabled',
        'ASSIGNEE_REQUIRED',
        400,
      )
    }

    const updates: {
      updatedAt: Date
      autoAssign?: boolean
      defaultAssigneeId?: string | null
    } = { updatedAt: new Date() }
    if (hasAutoAssign) updates.autoAssign = settings.autoAssign as boolean
    if (hasAssignee) updates.defaultAssigneeId = nextAssigneeId

    await db
      .update(metaConnections)
      .set(updates)
      .where(eq(metaConnections.tenantId, ctx.tenant.id))

    return successResponse({ updated: true })
  })
}
