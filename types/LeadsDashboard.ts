export type LeadRow = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string | null
  lastContactedAt: string | null
  createdAt: string
  lastQualification: string | null
  isDeadManual: boolean
  assignedTo: string | null
  tags: { id: string; name: string; color: string }[]
}

export type Agent = {
  userId: string
  name: string
  email: string
  role: string
  activeLeadCount: number
}

export type SubStatusType = 'in_progress' | 'closed_lost' | 'defer'

export type SubStatusRow = {
  id: string
  stageKey: string
  label: string
  type: SubStatusType
  closedActions: string[]
}

export type SubStatusOption = {
  value: string
  label: string
  subStatusId: string
  closedAction: string | null
}

export const SUB_STATUS_TYPE_OPTIONS: { value: SubStatusType; label: string }[] = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed_lost', label: 'Closed' },
  { value: 'defer', label: 'Defer' },
]

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function yearOptions() {
  return Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 1 + i)
}

export function buildSubStatusOptions(subStatuses: SubStatusRow[], type: SubStatusType | null): SubStatusOption[] {
  if (!type) return []
  const forType = subStatuses.filter((ss) => ss.type === type)
  const showPrefix = forType.length > 1
  const rows: SubStatusOption[] = []
  for (const ss of forType) {
    if (ss.closedActions.length > 0) {
      for (const action of ss.closedActions) {
        rows.push({
          value: `${ss.id}::${action}`,
          label: showPrefix ? `${ss.label} — ${action}` : action,
          subStatusId: ss.id,
          closedAction: action,
        })
      }
    } else {
      rows.push({ value: ss.id, label: ss.label, subStatusId: ss.id, closedAction: null })
    }
  }
  return rows
}