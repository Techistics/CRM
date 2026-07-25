import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  jsonb,
  boolean,
  decimal,
  varchar,
  unique,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Tenants (workspaces) ─────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'suspended'] })
    .notNull()
    .default('active'),
  settings: jsonb('settings'),
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Users ───────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  globalRole: text('global_role', { enum: ['SUPER_ADMIN'] }),
  credentialVersion: integer('credential_version').notNull().default(0),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Tenant membership ────────────────────────────────────────
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role', { enum: ['ADMIN', 'PRO'] }).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    tenantPassword: text('tenant_password'),
    credentialVersion: integer('credential_version').notNull().default(0),
    customRoleId: uuid('custom_role_id')
      .references(() => customRoles.id, { onDelete: 'set null' }),
  },
  (t) => ({
    unq: unique().on(t.tenantId, t.userId),
    idx_userId: index('idx_tenant_members_user_id').on(t.userId),
    idx_tenantId: index('idx_tenant_members_tenant_id').on(t.tenantId),
  }),
)

// ─── Invitations ───────────────────────────────────────────
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    email: text('email').notNull(),
    role: text('role', { enum: ['ADMIN', 'PRO'] }).notNull(),
    customRoleId: uuid('custom_role_id')
      .references(() => customRoles.id, { onDelete: 'set null' }),
    token: text('token').notNull().unique(),
    status: text('status', { enum: ['PENDING', 'ACCEPTED', 'EXPIRED'] })
      .notNull()
      .default('PENDING'),
    expiresAt: timestamp('expires_at').notNull(),
    invitedBy: uuid('invited_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    idx_token: index('idx_invitations_token').on(t.token),
  }),
)

// ─── Audit Logs ──────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  targetUserEmail: text('target_user_email'),
  tenantId: uuid('tenant_id').references(() => tenants.id, {
    onDelete: 'set null',
  }),
  action: text('action', {
    enum: [
      'INVITE_SENT',
      'INVITE_ACCEPTED',
      'ROLE_CHANGED',
      'TENANT_CREATED',
      'SUPER_ADMIN_ACTION',
    ],
  }).notNull(),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// ─── Relations ───────────────────────────────────────────────
export const tenantRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
}))

export const tenantMemberRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMembers.userId],
    references: [users.id],
  }),
}))

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
  /**
   * Workspace-configured pipeline: single “primary” stage for Kanban/analytics.
   * Multi-stage is stored in leadStageAssignments.
   */
  primaryStage: varchar('primary_stage', { length: 64 }).notNull().default('new_lead'),
  lastContactedAt: timestamp('last_contacted_at'),

  assignedTo: uuid('assigned_to').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdBy: uuid('created_by').references(() => users.id),
  dealValue: decimal('deal_value', { precision: 12, scale: 2 }),
  dealCurrency: varchar('deal_currency', { length: 3 }).default('USD').notNull(),
  intakeMonth: text('intake_month'), // e.g. "Sep 2026", "Jan 2027"
  destinationCountry: text('destination_country'), // nullable
  programOfInterest: text('program_of_interest'), // nullable
  deadReason: text('dead_reason'), // nullable
  isDeadManual: boolean('is_dead_manual').default(false), // defaults to false
  reassignedFrom: uuid('reassigned_from').references(() => users.id, { onDelete: 'set null' }),
  csvImportId: uuid('csv_import_id').references(() => csvImports.id, { onDelete: 'set null' }),
  subStatusId: uuid('sub_status_id').references(() => pipelineSubStatuses.id, { onDelete: 'set null' }),
  closedAction: text('closed_action'),
  /** Values for the selected sub-status custom fields (keyed by field key). */
  subStatusFieldValues: jsonb('sub_status_field_values').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (t) => ({
  unq_email: unique('unq_leads_email_tenant').on(t.tenantId, t.email),
  unq_phone: unique('unq_leads_phone_tenant').on(t.tenantId, t.contactNumber),
}))

// ─── Workspace Pipeline Configuration ──────────────────────────
export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    key: varchar('key', { length: 64 }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    unq_tenant_key: unique('pipeline_stages_tenant_key_unique').on(t.tenantId, t.key),
    idx_tenant: index('idx_pipeline_stages_tenant').on(t.tenantId),
  }),
)// pipelineStageCooccurrence removed — feature deprecated. DB table left intact intentionally.

export const leadStageAssignments = pgTable(
  'lead_stage_assignments',
  {
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    stageKey: varchar('stage_key', { length: 64 }).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.leadId, t.stageKey] }),
    idx_lead: index('idx_lead_stage_assignments_lead').on(t.leadId),
    idx_tenant: index('idx_lead_stage_assignments_tenant').on(t.tenantId),
  }),
)

// ─── Lead WhatsApp Logs ────────────────────────────────────────
export const leadWhatsappLogs = pgTable('lead_whatsapp_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  direction: varchar('direction', { length: 10 }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Follow-up Templates ───────────────────────────────────────
export const followUpTemplates = pgTable('follow_up_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  stage: varchar('stage', { length: 50 }),
  message: text('message').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  required: boolean('required').notNull().default(false),
  isSubmitted: boolean('is_submitted').notNull().default(false),
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
    enum: ['lead_assigned', 'stage_changed', 'note_added', 'stale_lead'],
  }).notNull(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  read: boolean('read').default(false),
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
    enum: ['stage_change', 'note', 'call', 'message', 'document', 'whatsapp'],
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
  userId: uuid('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  email: text('email').notNull(),
  name: text('name').notNull(),
  requestedRole: text('requested_role', {
    enum: ['ADMIN', 'PRO'],
  }).notNull(),
  status: text('status', {
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
    .notNull()
    .default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, {
    onDelete: 'set null',
  }),
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

// ─── Lead Tags ──────────────────────────────────────────────
export const leadTags = pgTable(
  'lead_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#3b82f6'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.tenantId, t.name),
    idx_tenant: index('idx_lead_tags_tenant').on(t.tenantId),
  }),
)

export const leadTagAssignments = pgTable(
  'lead_tag_assignments',
  {
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => leadTags.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.leadId, t.tagId] }),
    idx_lead: index('idx_tag_assignments_lead').on(t.leadId),
    idx_tag: index('idx_tag_assignments_tag').on(t.tagId),
  }),
)

// ─── Relations (cont.) ────────────────────────────────────────
export const leadRelations = relations(leads, ({ many }) => ({
  tagAssignments: many(leadTagAssignments),
  revenues: many(leadRevenues),
}))

export const leadTagRelations = relations(leadTags, ({ many }) => ({
  assignments: many(leadTagAssignments),
}))

export const leadTagAssignmentRelations = relations(leadTagAssignments, ({ one }) => ({
  lead: one(leads, {
    fields: [leadTagAssignments.leadId],
    references: [leads.id],
  }),
  tag: one(leadTags, {
    fields: [leadTagAssignments.tagId],
    references: [leadTags.id],
  }),
}))

// ─── Lead Revenues ────────────────────────────────────────────
export const leadRevenues = pgTable(
  'lead_revenues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    intake: text('intake'),
    university: text('university'),
    country: text('country'),
    counselorFee: decimal('counselor_fee', { precision: 12, scale: 2 }),
    universityFee: decimal('university_fee', { precision: 12, scale: 2 }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    idx_lead: index('idx_lead_revenues_lead').on(t.leadId),
    idx_tenant: index('idx_lead_revenues_tenant').on(t.tenantId),
  })
)

export const leadRevenueRelations = relations(leadRevenues, ({ one }) => ({
  lead: one(leads, {
    fields: [leadRevenues.leadId],
    references: [leads.id],
  }),
  tenant: one(tenants, {
    fields: [leadRevenues.tenantId],
    references: [tenants.id],
  }),
}))

export const customRoles = pgTable(
  'custom_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    permissions: jsonb('permissions').notNull().default([]),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.tenantId, t.name),
    idx_tenant: index('idx_custom_roles_tenant').on(t.tenantId),
  })
)


// ─── Tenant Timesheets ────────────────────────────────────────────────────────
export const tenantTimesheets = pgTable('tenant_timesheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Updated type to match tenants.id (uuid) **/
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  punchIn: timestamp('punch_in', { withTimezone: true }).notNull(),
  punchOut: timestamp('punch_out', { withTimezone: true }), // nullable
  totalMinutes: integer('total_minutes'), // nullable, to be computed on punchOut
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
})

export const invitationRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invitations.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}))

export const consultantLogs = pgTable(
  'consultant_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    leadId: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    type: text('type', { enum: ['note', 'call', 'message'] }).notNull().default('note'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    idx_tenant: index('idx_consultant_logs_tenant').on(t.tenantId),
    idx_lead: index('idx_consultant_logs_lead').on(t.leadId),
    idx_user: index('idx_consultant_logs_user').on(t.userId),
  })
)

export const pipelineSubStatuses = pgTable(
  'pipeline_sub_statuses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    stageKey: varchar('stage_key', { length: 64 }).notNull(),
    label: text('label').notNull(),
    type: text('type', { enum: ['in_progress', 'closed_lost', 'defer'] })
      .notNull()
      .default('in_progress'),
    closedActions: jsonb('closed_actions').notNull().default([]),
    customFieldsEnabled: boolean('custom_fields_enabled').notNull().default(false),
    customFields: jsonb('custom_fields').notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    idx_tenant: index('idx_pipeline_sub_statuses_tenant').on(t.tenantId),
    idx_stage: index('idx_pipeline_sub_statuses_stage').on(t.tenantId, t.stageKey),
  })
)

// ─── Counselor Diaries ─────────────────────────────────────────────────────────
export const counselorDiaries = pgTable('counselor_diaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  diaryDate: date('diary_date').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(), // e.g. "09:00"
  endTime: varchar('end_time', { length: 5 }).notNull(), // e.g. "17:00"
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  idx_tenant: index('idx_counselor_diaries_tenant').on(t.tenantId),
  idx_user: index('idx_counselor_diaries_user').on(t.userId),
  idx_date: index('idx_counselor_diaries_date').on(t.diaryDate),
}))