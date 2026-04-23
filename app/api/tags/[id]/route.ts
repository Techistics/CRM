import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { leadTags } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { z } from 'zod'

const tagUpdateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    // Verify ownership
    const [existing] = await db
      .select({ tenantId: leadTags.tenantId })
      .from(leadTags)
      .where(eq(leadTags.id, id))

    if (!existing) {
      return errorResponse('Tag not found', 'NOT_FOUND', 404)
    }

    if (existing.tenantId !== ctx.tenant.id) {
      return errorResponse('Forbidden: You do not own this tag', 'FORBIDDEN', 403)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = tagUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const [updated] = await db
      .update(leadTags)
      .set(parsed.data)
      .where(eq(leadTags.id, id))
      .returning()

    return successResponse({ tag: updated })
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    // Verify ownership
    const [existing] = await db
      .select({ tenantId: leadTags.tenantId })
      .from(leadTags)
      .where(eq(leadTags.id, id))

    if (!existing) {
      return errorResponse('Tag not found', 'NOT_FOUND', 404)
    }

    if (existing.tenantId !== ctx.tenant.id) {
      return errorResponse('Forbidden: You do not own this tag', 'FORBIDDEN', 403)
    }

    await db.delete(leadTags).where(eq(leadTags.id, id))

    return successResponse({ ok: true })
  })
}
