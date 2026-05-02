import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { pipelineStages, pipelineStageCooccurrence } from '@/db/schema'

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

  const rules = await db
    .select()
    .from(pipelineStageCooccurrence)
    .where(eq(pipelineStageCooccurrence.tenantId, tenantId))

  const stageKeys = new Set(stages.map((s) => s.key))
  const allowedPair = new Set<string>()
  for (const r of rules) {
    if (!r.allowed) continue
    const a = r.stageKeyA
    const b = r.stageKeyB
    const k = a < b ? `${a}__${b}` : `${b}__${a}`
    allowedPair.add(k)
  }

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
    allowedPair,
  }
}

export function isPairAllowed(allowedPair: Set<string>, a: string, b: string) {
  if (a === b) return true
  const k = a < b ? `${a}__${b}` : `${b}__${a}`
  return allowedPair.has(k)
}

