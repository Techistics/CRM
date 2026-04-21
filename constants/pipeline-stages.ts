import type { StageValue } from '@/types/leads'

/** Single source of truth for pipeline order, labels, and dashboard colors. */
export const PIPELINE_STAGES = [
  { value: 'new_lead', label: 'New Lead', chartColor: '#3b82f6', kanbanBorder: 'border-t-blue-500' },
  { value: 'unresponsive', label: 'Unresponsive', chartColor: '#6b7280', kanbanBorder: 'border-t-gray-500' },
  { value: 'follow_up', label: 'Follow Up', chartColor: '#eab308', kanbanBorder: 'border-t-yellow-500' },
  { value: 'docs_received', label: 'Docs Received', chartColor: '#a855f7', kanbanBorder: 'border-t-purple-500' },
  { value: 'options_sent', label: 'Options Sent', chartColor: '#6366f1', kanbanBorder: 'border-t-indigo-500' },
  { value: 'final_decision', label: 'Final Decision', chartColor: '#f97316', kanbanBorder: 'border-t-orange-500' },
  { value: 'walkin_booked', label: 'Walk-in Booked', chartColor: '#14b8a6', kanbanBorder: 'border-t-teal-500' },
  { value: 'walkin_conducted', label: 'Walk-in Done', chartColor: '#06b6d4', kanbanBorder: 'border-t-cyan-500' },
  { value: 'cancelled', label: 'Cancelled', chartColor: '#ef4444', kanbanBorder: 'border-t-red-500' },
  { value: 'paid', label: 'Paid', chartColor: '#10b981', kanbanBorder: 'border-t-emerald-500' },
] as const satisfies ReadonlyArray<{
  value: StageValue
  label: string
  chartColor: string
  kanbanBorder: string
}>

const STAGE_SET = new Set<string>(PIPELINE_STAGES.map((s) => s.value))

export function isValidLeadStage(value: unknown): value is StageValue {
  return typeof value === 'string' && STAGE_SET.has(value)
}
