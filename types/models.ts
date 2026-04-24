import {
  users,
  leads,
  leadActivities,
  leadDocumentChecklist,
  leadUploadedDocuments,
  leadReminders,
  csvImports,
  notifications,
  roleRequests,
  tenants,
  tenantMembers,
} from '@/db/schema'

export type Tenant = typeof tenants.$inferSelect
export type TenantMember = typeof tenantMembers.$inferSelect
export type User = typeof users.$inferSelect
export type Lead = typeof leads.$inferSelect
export type LeadActivity = typeof leadActivities.$inferSelect
export type LeadReminder = typeof leadReminders.$inferSelect
export type LeadDocumentChecklistItem = typeof leadDocumentChecklist.$inferSelect
export type LeadUploadedDocument = typeof leadUploadedDocuments.$inferSelect
export type CsvImport = typeof csvImports.$inferSelect
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

export type LeadStage = StageValue
export type Notification = typeof notifications.$inferSelect
export type RoleRequest = typeof roleRequests.$inferSelect
