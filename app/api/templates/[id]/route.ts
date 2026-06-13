import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { followUpTemplates } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  stage: z.string().max(50).nullable().optional(),
  message: z.string().min(1).max(2000).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('templates.manage')
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400)
    }

    const [existing] = await db
      .select()
      .from(followUpTemplates)
      .where(and(eq(followUpTemplates.id, id), eq(followUpTemplates.tenantId, ctx.tenant.id)))
      .limit(1)

    if (!existing) {
      return errorResponse('Template not found', 'NOT_FOUND', 404)
    }

    const next: Partial<typeof followUpTemplates.$inferInsert> = {}
    if (parsed.data.name !== undefined) next.name = parsed.data.name.trim()
    if (parsed.data.stage !== undefined) next.stage = parsed.data.stage?.trim() || null
    if (parsed.data.message !== undefined) next.message = parsed.data.message.trim()

    if (Object.keys(next).length === 0) {
      return successResponse({ template: existing, unchanged: true })
    }

    const [updated] = await db
      .update(followUpTemplates)
      .set(next)
      .where(and(eq(followUpTemplates.id, id), eq(followUpTemplates.tenantId, ctx.tenant.id)))
      .returning()

    return successResponse({ template: updated })
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('templates.manage')
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const [existing] = await db
      .select({ id: followUpTemplates.id })
      .from(followUpTemplates)
      .where(and(eq(followUpTemplates.id, id), eq(followUpTemplates.tenantId, ctx.tenant.id)))
      .limit(1)

    if (!existing) {
      return errorResponse('Template not found', 'NOT_FOUND', 404)
    }

    await db
      .delete(followUpTemplates)
      .where(and(eq(followUpTemplates.id, id), eq(followUpTemplates.tenantId, ctx.tenant.id)))

    return successResponse({ success: true })
  })
}

