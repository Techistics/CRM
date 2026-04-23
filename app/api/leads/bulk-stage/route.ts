import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { isValidLeadStage } from '@/constants/pipeline-stages'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'

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
    if (!isValidLeadStage(stage)) {
      return errorResponse('Invalid stage', 'VALIDATION_ERROR', 400)
    }

    const affected = await db
      .select({ id: leads.id, fromStage: leads.stage })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))

    const updated = await db
      .update(leads)
      .set({ stage, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))
      .returning({ id: leads.id })

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
