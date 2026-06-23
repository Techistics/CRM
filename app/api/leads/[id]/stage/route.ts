import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, leadActivities, leadStageAssignments } from '@/db/schema'
import { requireLeadEditApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { getTenantPipeline } from '@/lib/pipeline/config'
import { validateStageTransition } from '@/lib/lead-stage-validation'

const bodySchema = z.union([
  z.object({
    stage: z.string().min(1),
    deadReason: z.string().optional()
  }).strict(),
  z
    .object({
      primaryStage: z.string().min(1),
      activeStages: z.array(z.string().min(1)).min(1).max(60),
      deadReason: z.string().optional()
    })
    .strict(),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid request body', 'INVALID_JSON', 400)
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)
    }

    const pipeline = await getTenantPipeline(ctx.tenant.id)
    if (pipeline.stages.length === 0) {
      return errorResponse('Pipeline not configured', 'PIPELINE_NOT_CONFIGURED', 409)
    }

    const primaryStage =
      'stage' in parsed.data ? parsed.data.stage : parsed.data.primaryStage
    const activeStages =
      'stage' in parsed.data
        ? [parsed.data.stage]
        : Array.from(new Set(parsed.data.activeStages))

    if (!pipeline.stageKeys.has(primaryStage)) {
      return errorResponse('Invalid stage', 'INVALID_STAGE', 400)
    }
    for (const s of activeStages) {
      if (!pipeline.stageKeys.has(s)) {
        return errorResponse('Invalid stage', 'INVALID_STAGE', 400)
      }
    }

    // Ensure primary is included.
    if (!activeStages.includes(primaryStage)) activeStages.unshift(primaryStage)


    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      toMemberScope(ctx),
    )
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const validation = validateStageTransition(
      lead.primaryStage,
      primaryStage,
      pipeline.stages,
      parsed.data.deadReason
    )
    if (!validation.valid) {
      return errorResponse(validation.error!, 'INVALID_TRANSITION', 400)
    }

    if (lead.primaryStage === primaryStage && activeStages.length === 1) {
      await db
        .update(leads)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))
      return successResponse({ success: true, unchanged: true })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(leads)
        .set({
          primaryStage,
          // Keep legacy column in sync until we fully remove it.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stage: primaryStage as any,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

      await tx
        .delete(leadStageAssignments)
        .where(and(eq(leadStageAssignments.leadId, id), eq(leadStageAssignments.tenantId, ctx.tenant.id)))

      await tx.insert(leadStageAssignments).values(
        activeStages.map((s) => ({
          tenantId: ctx.tenant.id,
          leadId: id,
          stageKey: s,
          createdBy: ctx.dbUserId,
        })),
      )

      await tx.insert(leadActivities).values({
        tenantId: ctx.tenant.id,
        leadId: id,
        userId: ctx.dbUserId,
        type: 'stage_change',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fromStage: (lead.primaryStage ?? lead.stage) as any,
        toStage: primaryStage,
        note: activeStages.length > 1 ? `Active: ${activeStages.join(', ')}` : null,
      })
    })

    return successResponse({ success: true })
  })
}
