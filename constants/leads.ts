export const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new_lead:         { label: 'New Lead',       color: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' },
  unresponsive:     { label: 'Unresponsive',   color: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm' },
  follow_up:        { label: 'Follow Up',      color: 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm' },
  docs_received:    { label: 'Docs Received',  color: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' },
  options_sent:     { label: 'Options Sent',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' },
  final_decision:   { label: 'Final Decision', color: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm' },
  walkin_booked:    { label: 'Walk-in Booked', color: 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' },
  walkin_conducted: { label: 'Walk-in Done',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm' },
  cancelled:        { label: 'Cancelled',      color: 'bg-red-50 text-red-700 border-red-200 shadow-sm' },
  paid:             { label: 'Paid',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' },
}
