import { NextRequest } from 'next/server'
import { and, eq, ilike } from 'drizzle-orm'
import { db } from '@/db'
import { leadTags } from '@/db/schema'
import { requireTenantMemberApi, requireTenantAdminApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { z } from 'zod'

const tagSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').default('#3b82f6'),
})

export async function GET(_req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const tags = await db
      .select()
      .from(leadTags)
      .where(eq(leadTags.tenantId, ctx.tenant.id))
      .orderBy(leadTags.name)

    return successResponse({ tags })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = tagSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { name, color } = parsed.data

    // Case-insensitive check
    const [existing] = await db
      .select({ id: leadTags.id })
      .from(leadTags)
      .where(and(eq(leadTags.tenantId, ctx.tenant.id), ilike(leadTags.name, name)))

    if (existing) {
      return errorResponse('Tag with this name already exists', 'CONFLICT', 409)
    }

    try {
      const [tag] = await db
        .insert(leadTags)
        .values({
          tenantId: ctx.tenant.id,
          name,
          color,
        })
        .returning()

      return successResponse({ tag }, 201)
    } catch (err) {
      // In case of race condition
      const error = err as { code?: string }
      if (error.code === '23505') {
        return errorResponse('Tag with this name already exists', 'CONFLICT', 409)
      }
      throw err
    }
  })
}
