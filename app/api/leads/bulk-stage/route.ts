import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, leadActivities, leadStageAssignments } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { leadIdsInScopeWhere } from '@/lib/leads-scope'
import { toMemberScope } from '@/lib/member-scope'
import { requirePermissionApi } from '@/lib/tenant-api'
import { getTenantPipeline } from '@/lib/pipeline/config'
import { validateStageTransition } from '@/lib/lead-stage-validation'

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  stage: z.string(),
  deadReason: z.string().optional(),
  tenantSlug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.edit')
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

    const scopedIds = await db
      .select({ id: leads.id })
      .from(leads)
      .where(leadIdsInScopeWhere(ctx.tenant.id, parsed.data.leadIds, toMemberScope(ctx)))

    if (scopedIds.length === 0) {
      return successResponse({ updated: 0 })
    }

    const allowedLeadIds = scopedIds.map((r) => r.id)

    const affected = await db
      .select({ id: leads.id, fromStage: leads.primaryStage })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, allowedLeadIds)))

    for (const lead of affected) {
      const validation = validateStageTransition(lead.fromStage, stage, pipeline.stages, parsed.data.deadReason)
      if (!validation.valid) {
        return errorResponse(`Lead ${lead.id}: ${validation.error}`, 'INVALID_TRANSITION', 400)
      }
    }

    const updated = await db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(leads)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({
          primaryStage: stage,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stage: stage as any,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, allowedLeadIds)))
        .returning({ id: leads.id })

      await tx
        .delete(leadStageAssignments)
        .where(and(eq(leadStageAssignments.tenantId, ctx.tenant.id), inArray(leadStageAssignments.leadId, allowedLeadIds)))

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
