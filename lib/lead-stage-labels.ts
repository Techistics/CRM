/** Shared labels for pipeline stages (activity timeline + forms). */
export const LEAD_STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  unresponsive: 'Unresponsive',
  follow_up: 'Follow Up',
  docs_received: 'Docs Received',
  options_sent: 'Options Sent',
  final_decision: 'Final Decision',
  walkin_booked: 'Walk-in Booked',
  walkin_conducted: 'Walk-in Done',
  cancelled: 'Cancelled',
  paid: 'Paid',
}

export function leadStageLabel(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return LEAD_STAGE_LABELS[value] ?? value
}
