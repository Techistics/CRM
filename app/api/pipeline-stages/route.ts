import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { pipelineStages } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
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
