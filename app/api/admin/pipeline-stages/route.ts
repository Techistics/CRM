import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm';
import { z } from 'zod'

import { db } from '@/db'
import { pipelineStages } from '@/db/schema' // trigger rebuild
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'

const stageSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'key must be snake_case (a-z0-9_)'),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
  meta: z.record(z.string(), z.any()).nullable().optional(),
})

const saveSchema = z
  .object({
    stages: z.array(stageSchema).min(1).max(60),
  })
  .strict()

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, ctx.tenant.id))
      .orderBy(pipelineStages.sortOrder, pipelineStages.createdAt)

    return successResponse({
      stages: stages.map((s) => ({
        key: s.key,
        label: s.label,
        sortOrder: s.sortOrder,
        meta: (s.meta as unknown) ?? null,
      })),
    })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 'INVALID_JSON', 400)

    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const keys = parsed.data.stages.map((s) => s.key)
    const keySet = new Set(keys)
    if (keySet.size !== keys.length) {
      return errorResponse('Stage keys must be unique', 'DUPLICATE_KEYS', 400)
    }

    // Normalize sort order if not provided.
    const normalizedStages = parsed.data.stages
      .map((s, idx) => ({
        ...s,
        sortOrder: s.sortOrder ?? idx,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    // Transaction: replace existing config for this tenant.
    await db.transaction(async (tx) => {
      await tx.delete(pipelineStages).where(eq(pipelineStages.tenantId, ctx.tenant.id))

      await tx.insert(pipelineStages).values(
        normalizedStages.map((s) => ({
          tenantId: ctx.tenant.id,
          key: s.key,
          label: s.label,
          sortOrder: s.sortOrder!,
          meta: s.meta ?? null,
        })),
      )
    })

    return successResponse({ success: true })
  })
}
