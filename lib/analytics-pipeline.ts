import { and, count, eq, gte } from 'drizzle-orm'

import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { getTenantPipeline } from '@/lib/pipeline/config'
import type {
  ChartWindow,
  FunnelStep,
  PipelineChartSnapshot,
  StageDatum,
} from '@/types/analytics'

function chartColorForStage(key: string) {
  return PIPELINE_STAGES.find((s) => s.value === key)?.chartColor ?? '#6b7280'
}

export function startDateForChartWindow(window: ChartWindow): Date {
  const d = new Date()
  if (window === 'week') {
    d.setDate(d.getDate() - 7)
  } else if (window === 'month') {
    d.setMonth(d.getMonth() - 1)
  } else {
    d.setFullYear(d.getFullYear() - 1)
  }
  return d
}

export async function getPipelineSnapshotForTenant(
  tenantId: string,
  createdSince: Date,
): Promise<PipelineChartSnapshot> {
  const tScope = and(eq(leads.tenantId, tenantId), gte(leads.createdAt, createdSince))

  const pipeline = await getTenantPipeline(tenantId)
  const byStage = await db
    .select({ stage: leads.primaryStage, total: count(leads.id) })
    .from(leads)
    .where(tScope)
    .groupBy(leads.primaryStage)

  const totalLeads = byStage.reduce((sum, s) => sum + Number(s.total), 0)

  const stageData: StageDatum[] = (pipeline.stages.length > 0 ? pipeline.stages : PIPELINE_STAGES.map((s) => ({
    key: s.value,
    label: s.label,
    sortOrder: 0,
    meta: null,
  }))).map((s) => ({
    value: s.key,
    label: s.label,
    count: Number(byStage.find((b) => b.stage === s.key)?.total ?? 0),
    color: chartColorForStage(s.key),
  }))

  const paidCount = Number(byStage.find((b) => b.stage === 'paid')?.total ?? 0)

  const funnelSteps: FunnelStep[] = [
    {
      label: 'Total imported',
      count: totalLeads,
      pct: 100,
      colorClass: 'bg-blue-500',
    },
    {
      label: 'Contacted (follow up+)',
      count: stageData
        .filter((s) =>
          [
            'follow_up',
            'docs_received',
            'options_sent',
            'final_decision',
            'walkin_booked',
            'walkin_conducted',
            'paid',
          ].includes(s.value),
        )
        .reduce((sum, s) => sum + s.count, 0),
      pct:
        totalLeads > 0
          ? Math.round(
              (stageData
                .filter((s) =>
                  [
                    'follow_up',
                    'docs_received',
                    'options_sent',
                    'final_decision',
                    'walkin_booked',
                    'walkin_conducted',
                    'paid',
                  ].includes(s.value),
                )
                .reduce((sum, s) => sum + s.count, 0) /
                totalLeads) *
                100,
            )
          : 0,
      colorClass: 'bg-purple-500',
    },
    {
      label: 'Walk-in booked',
      count:
        (stageData.find((s) => s.value === 'walkin_booked')?.count ?? 0) +
        (stageData.find((s) => s.value === 'walkin_conducted')?.count ?? 0) +
        paidCount,
      pct:
        totalLeads > 0
          ? Math.round(
              (((stageData.find((s) => s.value === 'walkin_booked')?.count ??
                0) +
                (stageData.find((s) => s.value === 'walkin_conducted')
                  ?.count ?? 0) +
                paidCount) /
                totalLeads) *
                100,
            )
          : 0,
      colorClass: 'bg-teal-500',
    },
    {
      label: 'Paid',
      count: paidCount,
      pct: totalLeads > 0 ? Math.round((paidCount / totalLeads) * 100) : 0,
      colorClass: 'bg-emerald-500',
    },
  ]

  return { totalLeads, stageData, funnelSteps }
}

export async function loadChartSnapshotsByWindow(tenantId: string) {
  const windows: ChartWindow[] = ['week', 'month', 'year']
  const entries = await Promise.all(
    windows.map(async (w) => {
      const since = startDateForChartWindow(w)
      const snap = await getPipelineSnapshotForTenant(tenantId, since)
      return [w, snap] as const
    }),
  )
  return Object.fromEntries(entries) as Record<ChartWindow, PipelineChartSnapshot>
}
