import { NextRequest } from 'next/server'
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod'

import { db } from '@/db'
import { pipelineStages, pipelineStageCooccurrence } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'

function normalizePair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const)
}

const stageSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'key must be snake_case (a-z0-9_)'),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
  meta: z.record(z.string(), z.any()).optional(),
})

const saveSchema = z
  .object({
    stages: z.array(stageSchema).min(1).max(60),
    /** Allowed co-occurring pairs (unordered). Omitted means “no extra pairs”. */
    allowedPairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).optional(),
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

    const rules = await db
      .select()
      .from(pipelineStageCooccurrence)
      .where(eq(pipelineStageCooccurrence.tenantId, ctx.tenant.id))

    return successResponse({
      stages: stages.map((s) => ({
        key: s.key,
        label: s.label,
        sortOrder: s.sortOrder,
        meta: (s.meta as unknown) ?? null,
      })),
      allowedPairs: rules
        .filter((r) => r.allowed)
        .map((r) => [r.stageKeyA, r.stageKeyB] as const),
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

    const normalizedPairs = (parsed.data.allowedPairs ?? [])
      .map(([a, b]) => normalizePair(a, b))
      .filter(([a, b]) => a !== b)

    // Validate that all pair keys exist in stage list.
    for (const [a, b] of normalizedPairs) {
      if (!keySet.has(a) || !keySet.has(b)) {
        return errorResponse('allowedPairs contains unknown stage keys', 'UNKNOWN_STAGE_KEY', 400)
      }
    }

    // Transaction: replace existing config for this tenant.
    await db.transaction(async (tx) => {
      await tx.delete(pipelineStageCooccurrence).where(eq(pipelineStageCooccurrence.tenantId, ctx.tenant.id))
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

      // Store allowed pairs only (absence => not allowed).
      if (normalizedPairs.length > 0) {
        // De-dupe pairs
        const uniq = new Map<string, readonly [string, string]>()
        for (const [a, b] of normalizedPairs) uniq.set(`${a}__${b}`, [a, b] as const)

        await tx.insert(pipelineStageCooccurrence).values(
          [...uniq.values()].map(([a, b]) => ({
            tenantId: ctx.tenant.id,
            stageKeyA: a,
            stageKeyB: b,
            allowed: true,
          })),
        )
      }
    })

    return successResponse({ success: true })
  })
}

