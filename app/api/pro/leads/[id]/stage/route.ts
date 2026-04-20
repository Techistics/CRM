import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq as dbEq, and as dbAnd } from 'drizzle-orm'

import { isValidLeadStage } from '@/constants/pipeline-stages'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const stageSchema = z.object({
  stage: z.string().refine(isValidLeadStage, { message: 'Invalid stage' })
})

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

    const parsed = stageSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
    }

    const { stage } = parsed.data

    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) {
      return errorResponse('Lead not found or no access', 'NOT_FOUND', 404)
    }

    if (lead.stage === stage) {
      return successResponse({ ok: true, unchanged: true })
    }

    await db
      .update(leads)
      .set({ stage, updatedAt: new Date() })
      .where(dbAnd(dbEq(leads.id, id), dbEq(leads.tenantId, ctx.tenant.id)))

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'stage_change',
      fromStage: lead.stage,
      toStage: stage,
    })

    return successResponse({ ok: true })
  })
}
