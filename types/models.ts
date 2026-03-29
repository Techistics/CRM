import { users, leads, leadActivities, csvImports, notifications, roleRequests } from '@/db/schema'

export type User = typeof users.$inferSelect
export type Lead = typeof leads.$inferSelect
export type LeadActivity = typeof leadActivities.$inferSelect
export type CsvImport = typeof csvImports.$inferSelect
export type LeadStage = Lead['stage']
export type Notification = typeof notifications.$inferSelect
export type RoleRequest = typeof roleRequests.$inferSelect
