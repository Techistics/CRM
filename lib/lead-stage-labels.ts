import { PIPELINE_STAGES } from '@/constants/pipeline-stages'

/** Shared labels for pipeline stages (activity timeline + forms). */
export const LEAD_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s.label]),
)

export function leadStageLabel(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return LEAD_STAGE_LABELS[value] ?? value
}

export function buildStageLabels(
  tenantStages: { key: string; label: string }[]
): Record<string, string> {
  if (tenantStages.length > 0) {
    return Object.fromEntries(tenantStages.map((s) => [s.key, s.label]))
  }
  return LEAD_STAGE_LABELS
}
