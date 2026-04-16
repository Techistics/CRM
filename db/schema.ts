import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ─── Tenants (workspaces) ─────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  brandName: text('brand_name'),
  status: text('status', { enum: ['active', 'suspended'] })
    .notNull()
    .default('active'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Users (synced from Clerk) ───────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  password: text('password'),
  avatarUrl: text('avatar_url'),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** @deprecated Use tenant_members.role per workspace */
  role: text('role', { enum: ['super_admin', 'tenant_admin', 'agent'] })
  .notNull()
  .default('agent'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Tenant membership ────────────────────────────────────────
export const tenantMembers = pgTable(
  'tenant_members',
  {
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role', { enum: ['tenant_admin', 'agent'] }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.userId] }),
  }),
)

// ─── Leads ───────────────────────────────────────────────────
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  fullName: text('full_name').notNull(),
  contactNumber: text('contact_number'),
  email: text('email'),
  city: text('city'),
  country: text('country').default('Pakistan'),
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

// ─── Lead Reminder Queue ──────────────────────────────────────
export const leadReminders = pgTable('lead_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  leadId: uuid('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  note: text('note'),
  dueAt: timestamp('due_at').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'overdue'] })
    .notNull()
    .default('pending'),
  assignedTo: uuid('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  completedAt: timestamp('completed_at'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Lead Country Document Checklist ──────────────────────────
export const leadDocumentChecklist = pgTable('lead_document_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  leadId: uuid('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  country: text('country').notNull(),
  documentKey: text('document_key').notNull(),
  documentLabel: text('document_label').notNull(),
  required: text('required').notNull().default('true'),
  isSubmitted: text('is_submitted').notNull().default('false'),
  submittedAt: timestamp('submitted_at'),
  verifiedBy: uuid('verified_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedBy: uuid('updated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ─── Lead file uploads (checklist is separate; this is actual files) ─
export const leadUploadedDocuments = pgTable('lead_uploaded_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  leadId: uuid('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  /** Public HTTPS URL (e.g. Vercel Blob, R2, S3). */
  storageUrl: text('storage_url').notNull(),
  label: text('label'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Notifications ────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type', {
    enum: ['lead_assigned', 'stage_changed', 'note_added'],
  }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  read: text('read').default('false'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Lead Activity Log ────────────────────────────────────────
export const leadActivities = pgTable('lead_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
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

// ─── Role access requests ─────────────────────────────────────
export const roleRequests = pgTable('role_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id').references(() => users.id),
  email: text('email').notNull(),
  name: text('name').notNull(),
  requestedRole: text('requested_role', { 
  enum: ['tenant_admin', 'agent'] 
}).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected'],
  })
    .notNull()
    .default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id)
})

// ─── CSV Import Batches ───────────────────────────────────────
export const csvImports = pgTable('csv_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
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


// ─── Invitations ──────────────────────────────────────────────
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['tenant_admin', 'agent'] }).notNull(),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Password Reset Tokens ────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
