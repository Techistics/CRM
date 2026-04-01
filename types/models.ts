import {
  users,
  leads,
  leadActivities,
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
export type CsvImport = typeof csvImports.$inferSelect
export type LeadStage = Lead['stage']
export type Notification = typeof notifications.$inferSelect
export type RoleRequest = typeof roleRequests.$inferSelect
