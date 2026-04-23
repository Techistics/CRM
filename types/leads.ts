import type { LeadActivity, User } from '@/types/models'

export type StageValue = 
  | "new_lead" 
  | "unresponsive" 
  | "follow_up" 
  | "docs_received" 
  | "options_sent" 
  | "final_decision" 
  | "walkin_booked" 
  | "walkin_conducted" 
  | "cancelled" 
  | "paid"

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
