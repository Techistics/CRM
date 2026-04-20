import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

import { isValidLeadStage } from '@/constants/pipeline-stages'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const stageSchema = z.object({
  stage: z.string().refine(isValidLeadStage, {
    message: 'Invalid stage',
  }),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid request body', 'INVALID_JSON', 400)
    }

    const parsed = stageSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 422)
    }

    const { stage } = parsed.data

    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    if (lead.stage === stage) {
      return successResponse({ success: true, unchanged: true })
    }

    await db
      .update(leads)
      .set({ stage, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'stage_change',
      fromStage: lead.stage,
      toStage: stage,
    })

    return successResponse({ success: true })
  })
}
