import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq as dbEq, and as dbAnd, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { leads, leadActivities, leadStageAssignments, tenantMembers, notifications } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
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
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
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
    if (!activeStages.includes(primaryStage)) activeStages.unshift(primaryStage)

    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) {
      return errorResponse('Lead not found or no access', 'NOT_FOUND', 404)
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
        .where(dbAnd(dbEq(leads.id, id), dbEq(leads.tenantId, ctx.tenant.id)))
      return successResponse({ ok: true, unchanged: true })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(leads)
        .set({
          primaryStage,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stage: primaryStage as any,
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(dbAnd(dbEq(leads.id, id), dbEq(leads.tenantId, ctx.tenant.id)))

      await tx
        .delete(leadStageAssignments)
        .where(dbAnd(dbEq(leadStageAssignments.leadId, id), dbEq(leadStageAssignments.tenantId, ctx.tenant.id)))

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

    const adminMembers = await db
      .select({ userId: tenantMembers.userId })
      .from(tenantMembers)
      .where(dbAnd(
        dbEq(tenantMembers.tenantId, ctx.tenant.id),
        dbEq(tenantMembers.role, 'ADMIN'),
        isNull(tenantMembers.deletedAt)
      ))

    const recipients = new Set(adminMembers.map(m => m.userId))
    recipients.delete(ctx.dbUserId)

    for (const userId of recipients) {
      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId,
        title: 'Stage updated',
        body: `${lead.fullName} moved to ${primaryStage}`,
        type: 'stage_changed',
        leadId: id,
      })
    }

    return successResponse({ ok: true })
  })
}
