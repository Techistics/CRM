import type { StageValue } from '@/types/models'
 
/** 
 * Single source of truth for pipeline stages.
 * Contains labels, colors for charts, Kanban cards, and badges.
 */
export const PIPELINE_STAGES = [
  { 
    value: 'new_lead', 
    label: 'New Lead', 
    chartColor: '#3b82f6', 
    kanbanBorder: 'border-t-blue-500',
    badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
    mutedClasses: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  { 
    value: 'unresponsive', 
    label: 'Unresponsive', 
    chartColor: '#6b7280', 
    kanbanBorder: 'border-t-gray-500',
    badgeClasses: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm',
    mutedClasses: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  },
  { 
    value: 'follow_up', 
    label: 'Follow Up', 
    chartColor: '#eab308', 
    kanbanBorder: 'border-t-yellow-500',
    badgeClasses: 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm',
    mutedClasses: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  },
  { 
    value: 'docs_received', 
    label: 'Docs Received', 
    chartColor: '#a855f7', 
    kanbanBorder: 'border-t-purple-500',
    badgeClasses: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm',
    mutedClasses: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  { 
    value: 'options_sent', 
    label: 'Options Sent', 
    chartColor: '#6366f1', 
    kanbanBorder: 'border-t-indigo-500',
    badgeClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm',
    mutedClasses: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  },
  { 
    value: 'final_decision', 
    label: 'Final Decision', 
    chartColor: '#f97316', 
    kanbanBorder: 'border-t-orange-500',
    badgeClasses: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm',
    mutedClasses: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  },
  { 
    value: 'walkin_booked', 
    label: 'Walk-in Booked', 
    chartColor: '#14b8a6', 
    kanbanBorder: 'border-t-teal-500',
    badgeClasses: 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm',
    mutedClasses: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  },
  { 
    value: 'walkin_conducted', 
    label: 'Walk-in Done', 
    chartColor: '#06b6d4', 
    kanbanBorder: 'border-t-cyan-500',
    badgeClasses: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm',
    mutedClasses: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  },
  { 
    value: 'cancelled', 
    label: 'Cancelled', 
    chartColor: '#ef4444', 
    kanbanBorder: 'border-t-red-500',
    badgeClasses: 'bg-red-50 text-red-700 border-red-200 shadow-sm',
    mutedClasses: 'bg-red-500/10 text-red-400 border-red-500/20'
  },
  { 
    value: 'paid', 
    label: 'Paid', 
    chartColor: '#10b981', 
    kanbanBorder: 'border-t-emerald-500',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
    mutedClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
] as const satisfies ReadonlyArray<{
  value: StageValue
  label: string
  chartColor: string
  kanbanBorder: string
  badgeClasses: string
  mutedClasses: string
}>
 
const STAGE_SET = new Set<string>(PIPELINE_STAGES.map((s) => s.value))
 
export function isValidLeadStage(value: unknown): value is StageValue {
  return typeof value === 'string' && STAGE_SET.has(value)
}

export function getStageInfo(value: string | null | undefined) {
  return PIPELINE_STAGES.find((s) => s.value === value) || PIPELINE_STAGES[0]
}

export const STAGE_LABELS = PIPELINE_STAGES.reduce((acc, stage) => {
  acc[stage.value] = {
    label: stage.label,
    color: stage.badgeClasses,
  }
  return acc
}, {} as Record<StageValue, { label: string; color: string }>)

