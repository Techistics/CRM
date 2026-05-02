import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, leadActivities, leadStageAssignments } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getTenantPipeline } from '@/lib/pipeline/config'

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  stage: z.string(),
  tenantSlug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    if (parsed.data.tenantSlug !== ctx.tenant.slug) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const stage = parsed.data.stage
    const pipeline = await getTenantPipeline(ctx.tenant.id)
    if (pipeline.stages.length === 0) {
      return errorResponse('Pipeline not configured', 'PIPELINE_NOT_CONFIGURED', 409)
    }
    if (!pipeline.stageKeys.has(stage)) return errorResponse('Invalid stage', 'VALIDATION_ERROR', 400)

    const affected = await db
      .select({ id: leads.id, fromStage: leads.primaryStage })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))

    const updated = await db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(leads)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ primaryStage: stage, stage: stage as any, updatedAt: new Date() })
        .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))
        .returning({ id: leads.id })

      await tx
        .delete(leadStageAssignments)
        .where(and(eq(leadStageAssignments.tenantId, ctx.tenant.id), inArray(leadStageAssignments.leadId, parsed.data.leadIds)))

      if (updatedRows.length > 0) {
        await tx.insert(leadStageAssignments).values(
          updatedRows.map((r) => ({
            tenantId: ctx.tenant.id,
            leadId: r.id,
            stageKey: stage,
            createdBy: ctx.dbUserId,
          })),
        )
      }

      return updatedRows
    })

    if (affected.length > 0) {
      const activityRows: (typeof leadActivities.$inferInsert)[] = affected.map((lead) => ({
          tenantId: ctx.tenant.id,
          leadId: lead.id,
          userId: ctx.dbUserId,
          type: 'stage_change' as const,
          fromStage: lead.fromStage,
          toStage: stage,
          note: `Stage changed in bulk to ${stage}`,
        }))

      await db.insert(leadActivities).values(activityRows)
    }

    return successResponse({ updated: updated.length })
  })
}
