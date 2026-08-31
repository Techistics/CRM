import type { LeadActivity, User } from '@/types/models'
import type { LeadRow, Agent, SubStatusType } from '@/types/LeadsDashboard'
export type { StageValue } from '@/types/models'

export type ActivityRow = {
  id: string
  type: LeadActivity['type']
  fromStage: string | null
  toStage: string | null
  note: string | null
  createdAt: Date | null
  userName: string | null
  userEmail: string | null
}

export type UserRow = Pick<User, 'id' | 'name'> & {
  /** Workspace role from `tenant_members` (e.g. agent, tenant_admin) */
  role: string
}

export type KanbanLead = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string | null
  lastQualification: string | null
  assigneeName: string | null
  /** Use for gating moves; assigneeName can be null if assignee row is missing. */
  assignedTo: string | null
}

export type TimelineActivity = {
  id: string
  type: LeadActivity['type']
  fromStage: string | null
  toStage: string | null
  note: string | null
  createdAt: Date | null
  userName: string | null
  userEmail: string | null
}

export type ImportResult = {
  success: boolean
  totalRows: number
  importedRows: number
  skippedRows: number
}

export type StageInfo = {
  label: string
  badgeClasses: string
}

export type LeadsTableProps = {
  leads: LeadRow[]
  loading: boolean
  error: string | null
  totalLeads: number
  isAdmin: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string, checked: boolean) => void
  onToggleSelectAll: (checked: boolean) => void
  stageInfoMap: Map<string, StageInfo>
  assigneeNameById: Map<string, string>
  onRowClick: (id: string) => void
}

export type PendingFilters = {
  tags: string[]
  stage: string | null
  subStatusType: SubStatusType | null
  subStatusId: string | null
  closedAction: string | null
  heat: string
  assignedTo: string | null
  appUniversityName: string | null
  appCourseName: string | null
  appSource: string | null
  appStatus: string | null
  appIntakeMonth: string | null
  appIntakeYear: string | null
  leadIntakeMonth: string | null
  leadIntakeYear: string | null
  revIntakeMonth: string | null
  revIntakeYear: string | null
}

export type FilterSheetProps = {
  tenantStages: { key: string; label: string }[]
  agents: Agent[]
  isAdmin: boolean
  heatFilter: string
  onHeatFilterChange: (heat: string) => void
  activeFilterCount: number
}

export type BulkActionsBarProps = {
  selectedCount: number
  isAdmin: boolean
  canDelete: boolean
  agents: Agent[]
  bulkActionLoading: boolean
  onAssign: (agentId: string) => void
  onMoveStage: (stage: string) => void
  onExport: () => void
  onDeleteClick: () => void
  onClearSelection: () => void
}
