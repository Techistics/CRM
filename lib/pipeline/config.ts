import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { pipelineStages } from '@/db/schema'

export type TenantPipelineStage = {
  key: string
  label: string
  sortOrder: number
  meta: unknown | null
}

export async function getTenantPipeline(tenantId: string) {
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenantId))
    .orderBy(pipelineStages.sortOrder, pipelineStages.createdAt)

  const stageKeys = new Set(stages.map((s) => s.key))

  return {
    stages: stages.map(
      (s): TenantPipelineStage => ({
        key: s.key,
        label: s.label,
        sortOrder: s.sortOrder,
        meta: (s.meta as unknown) ?? null,
      }),
    ),
    stageKeys,
  }
}
