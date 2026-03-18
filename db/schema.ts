import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    jsonb,
  } from 'drizzle-orm/pg-core'
  
  // ─── Users (synced from Clerk) ───────────────────────────────
  export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: ['admin', 'pro'] }).notNull().default('pro'),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // ─── Notifications ────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type', {
    enum: ['lead_assigned', 'stage_changed', 'note_added'],
  }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  read: text('read').default('false'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Notification = typeof notifications.$inferSelect

  // ─── Leads ───────────────────────────────────────────────────
  export const leads = pgTable('leads', {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    contactNumber: text('contact_number'),
    email: text('email'),
    city: text('city'),
    lastQualification: text('last_qualification'),
    grades: text('grades'),
    source: text('source').default('csv_import'),
    rawData: jsonb('raw_data'),
  
    stage: text('stage', {
      enum: [
        'new_lead',
        'unresponsive',
        'follow_up',
        'docs_received',
        'options_sent',
        'final_decision',
        'walkin_booked',
        'walkin_conducted',
        'cancelled',
        'paid',
      ],
    })
      .notNull()
      .default('new_lead'),
  
    assignedTo: uuid('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  })
  
  // ─── Lead Activity Log ────────────────────────────────────────
  export const leadActivities = pgTable('lead_activities', {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    type: text('type', {
      enum: ['stage_change', 'note', 'call', 'message', 'document'],
    }),
    fromStage: text('from_stage'),
    toStage: text('to_stage'),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // ─── CSV Import Batches ───────────────────────────────────────
  export const csvImports = pgTable('csv_imports', {
    id: uuid('id').primaryKey().defaultRandom(),
    importedBy: uuid('imported_by').references(() => users.id),
    fileName: text('file_name'),
    totalRows: integer('total_rows'),
    importedRows: integer('imported_rows'),
    skippedRows: integer('skipped_rows'),
    status: text('status', {
      enum: ['processing', 'done', 'failed'],
    }).default('processing'),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // ─── Types ────────────────────────────────────────────────────
  export type User = typeof users.$inferSelect
  export type Lead = typeof leads.$inferSelect
  export type LeadActivity = typeof leadActivities.$inferSelect
  export type CsvImport = typeof csvImports.$inferSelect
  export type LeadStage = Lead['stage']