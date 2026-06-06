# Project Tree — Techistics CRM
Last updated: 2026-04-25

## Stack
- Next.js App Router
- Drizzle ORM + Neon Postgres
- Custom JWT auth (see `lib/auth.ts`, `lib/tenant-api.ts`, `lib/tenant-server.ts`)
- Tailwind CSS + shadcn/ui + lucide-react
- Resend for emails (`lib/mail.ts`)

## Database Tables
- `tenants`: `id`, `slug`, `name`, `status`, `settings`, `createdBy`, `deletedAt`, `createdAt`
- `users`: `id`, `email`, `name`, `password`, `resetToken`, `resetTokenExpiry`, `globalRole`, `createdAt`
- `tenant_members`: `id`, `tenantId`, `userId`, `role`, `deletedAt`, `createdAt`
- `invitations`: `id`, `tenantId`, `email`, `role`, `token`, `status`, `expiresAt`, `invitedBy`, `createdAt`
- `audit_logs`: `id`, `actorUserId`, `targetUserEmail`, `tenantId`, `action`, `metadata`, `timestamp`
- `leads`: `id`, `tenantId`, `fullName`, `contactNumber`, `email`, `city`, `country`, `lastQualification`, `grades`, `source`, `rawData`, `stage`, `lastContactedAt`, `assignedTo`, `createdBy`, `dealValue`, `dealCurrency`, `createdAt`, `updatedAt`
- `lead_whatsapp_logs`: `id`, `tenantId`, `leadId`, `userId`, `direction`, `message`, `createdAt`
- `follow_up_templates`: `id`, `tenantId`, `name`, `stage?`, `message`, `createdBy?`, `createdAt`
- `lead_reminders`: `id`, `tenantId`, `leadId`, `title`, `note`, `dueAt`, `status`, `assignedTo`, `completedAt`, `createdBy`, `createdAt`, `updatedAt`
- `lead_document_checklist`: `id`, `tenantId`, `leadId`, `country`, `documentKey`, `documentLabel`, `required`, `isSubmitted`, `submittedAt`, `verifiedBy`, `updatedBy`, `createdAt`, `updatedAt`
- `lead_uploaded_documents`: `id`, `tenantId`, `leadId`, `fileName`, `mimeType`, `sizeBytes`, `storageUrl`, `label`, `uploadedBy`, `createdAt`
- `notifications`: `id`, `tenantId`, `userId`, `title`, `body`, `type`, `leadId`, `read`, `createdAt`
- `lead_activities`: `id`, `tenantId`, `leadId`, `userId`, `type`, `fromStage`, `toStage`, `note`, `createdAt`
- `role_requests`: `id`, `tenantId`, `userId`, `email`, `name`, `requestedRole`, `status`, `createdAt`, `reviewedAt`, `reviewedBy`
- `csv_imports`: `id`, `tenantId`, `importedBy`, `fileName`, `totalRows`, `importedRows`, `skippedRows`, `status`, `createdAt`
- `lead_tags`: `id`, `tenantId`, `name`, `color`, `createdAt`
- `lead_tag_assignments`: composite PK (`leadId`, `tagId`), `createdAt`

## API Routes
- POST `/api/auth/login` — auth: public — login
- POST `/api/auth/logout` — auth: member — logout
- POST `/api/auth/register` — auth: public — register
- POST `/api/admin/role-requests/[id]` — auth: admin — review role request
- GET `/api/admin/role-requests/[id]` — auth: admin — get role request
- GET `/api/admin/team-members` — auth: admin — list members
- PATCH `/api/admin/team-members/[userId]` — auth: admin — update member
- DELETE `/api/admin/team-members/[userId]` — auth: admin — remove member
- POST `/api/create-tenant-zero` — auth: public/system — bootstrap
- POST `/api/invite/accept` — auth: public — accept invite
- POST `/api/leads` — auth: member — create lead
- GET `/api/leads` — auth: member — list leads (filters/pagination)
- POST `/api/leads/import` — auth: member — import leads CSV
- POST `/api/leads/kanban` — auth: member — kanban data
- POST `/api/leads/bulk-assign` — auth: member — bulk assign
- POST `/api/leads/bulk-stage` — auth: member — bulk stage update
- POST `/api/leads/bulk-export` — auth: member — export leads
- DELETE `/api/leads/bulk-delete` — auth: member — bulk delete
- GET `/api/leads/[id]` — auth: member — lead detail
- PATCH `/api/leads/[id]/assign` — auth: member — assign lead
- GET `/api/leads/[id]/checklist` — auth: member — lead checklist
- POST `/api/leads/[id]/checklist` — auth: member — update checklist
- GET `/api/leads/[id]/documents` — auth: member — lead documents
- POST `/api/leads/[id]/documents` — auth: member — upload document
- DELETE `/api/leads/[id]/documents/[docId]` — auth: member — delete document
- GET `/api/leads/[id]/notes` — auth: member — list notes
- POST `/api/leads/[id]/notes` — auth: member — add note
- GET `/api/leads/[id]/reminders` — auth: member — list reminders
- POST `/api/leads/[id]/reminders` — auth: member — create reminder
- PATCH `/api/leads/[id]/reminders/[reminderId]` — auth: member — update reminder
- DELETE `/api/leads/[id]/reminders/[reminderId]` — auth: member — delete reminder
- PATCH `/api/leads/[id]/stage` — auth: member — change stage
- GET `/api/leads/[id]/whatsapp` — auth: member — list WhatsApp logs for lead
- POST `/api/leads/[id]/whatsapp` — auth: member — add WhatsApp log + activity + update lastContactedAt
- GET `/api/leads/[id]/tags` — auth: member — list tags
- POST `/api/leads/[id]/tags` — auth: member — update tags
- GET `/api/leads/[id]/delete-preview` — auth: member — deletion impact preview
- GET `/api/notifications` — auth: member — list notifications
- POST `/api/notifications/read` — auth: member — mark read
- GET `/api/reports/agent-export` — auth: admin — export agent report
- GET `/api/reports/pipeline-export` — auth: admin — export pipeline report
- POST `/api/t/[tenantSlug]/invite` — auth: admin — invite member
- GET `/api/tags` — auth: member — list tags
- POST `/api/tags` — auth: member — create tag
- PATCH `/api/tags/[id]` — auth: member — update tag
- DELETE `/api/tags/[id]` — auth: member — delete tag
- GET `/api/cron/stale-leads` — auth: cron/system — stale lead reminders/notifications
- GET `/api/templates` — auth: member — list templates (seeds defaults if empty)
- POST `/api/templates` — auth: admin — create template
- PATCH `/api/templates/[id]` — auth: admin — update template (tenant-owned)
- DELETE `/api/templates/[id]` — auth: admin — delete template (tenant-owned)
- (Pro namespace) GET/POST `/api/pro/leads` and lead-specific routes — auth: PRO — pro views

## Pages
- `/` — public — landing
- `/sign-in/[[...sign-in]]` — public — sign in
- `/sign-up/[[...sign-up]]` — public — sign up
- `/forgot-password` — public — request reset
- `/reset-password` — public — reset password
- `/invite/accept` — public — accept invitation
- `/accept-invite` — public — legacy accept invitation
- `/request-role` — member — request tenant role
- `/no-role` — member — no role screen
- `/no-access` — member — no access screen
- `/platform` — super admin — platform home
- `/platform/tenants` — super admin — tenants list
- `/platform/tenants/new` — super admin — create tenant
- `/t/[tenantSlug]` — member — tenant home
- `/t/[tenantSlug]/admin/overview` — admin — analytics overview
- `/t/[tenantSlug]/admin/leads` — admin — leads list
- `/t/[tenantSlug]/admin/leads/[id]` — admin — lead detail
- `/t/[tenantSlug]/admin/kanban` — admin — kanban
- `/t/[tenantSlug]/admin/team` — admin — team management
- `/t/[tenantSlug]/admin/requests` — admin — role requests
- `/t/[tenantSlug]/admin/import` — admin — import
- `/t/[tenantSlug]/admin/templates` — admin — manage follow-up templates
- `/t/[tenantSlug]/pro/overview` — pro — overview
- `/t/[tenantSlug]/pro/leads` — pro — leads list
- `/t/[tenantSlug]/pro/leads/[id]` — pro — lead detail
- `/t/[tenantSlug]/pro/kanban` — pro — kanban

## Key Files
- `db/schema.ts`: Drizzle schema (single source of truth)
- `lib/auth.ts`: JWT auth primitives
- `lib/tenant-api.ts`: API auth helpers (tenant member/admin)
- `lib/tenant-server.ts`: server auth helpers (tenant sessions)
- `lib/mail.ts`: Resend email sender helpers
- `lib/leads/heat.ts`: lead heat indicator calculation + UI config
- `constants/pipeline-stages.ts`: allowed lead stages + UI labels
- `components/admin/admin-sidebar.tsx`: admin navigation
- `components/pro/pro-sidebar.tsx`: pro navigation
- `components/LeadActivityTimeline.tsx`: lead activity UI
- `components/lead/*`: lead-specific UI (dialogs, docs, tags)

## Components (inventory)
- `app/components/NotificationBell.tsx`
- `components/Pagination.tsx`
- `components/PageSizeDropdown.tsx`
- `components/SearchInput.tsx`
- `components/KanbanBoard.tsx`
- `components/LeadActivityTimeline.tsx`
- `components/FetchInterceptor.tsx`
- `components/auth-toast-wrapper.tsx`
- `components/sidebar-provider.tsx`
- `components/admin/*` (sidebar/header/nav config)
- `components/pro/*` (sidebar/header/nav config)
- `components/analytics/*` (date range picker)
- `components/invitations/*` (invite accept)
- `components/lead/*` (lead docs, tags, create dialog)
- `components/shared/*` (theme toggle, user menu, role sidebar)
- `components/ui/*` (shadcn/ui primitives)
- `components/leads/WhatsappLogger.tsx` (WhatsApp logging UI)
- `components/leads/TemplateSelector.tsx` (follow-up templates picker + copy)
- `components/leads/StudentJourney.tsx` (student journey progress component)

## Features Implemented
- [x] Multi-tenant workspaces + roles (ADMIN/PRO)
- [x] Lead CRUD + assignment + tags
- [x] Reminders + overdue reconciliation + reminder emails
- [x] Lead activity timeline
- [x] Import/export + bulk actions
- [x] Notifications
- [x] Admin analytics overview
- [x] Lead heat indicator system (computed from `lastContactedAt`)
- [x] WhatsApp message logger (manual logs)
- [x] Quick follow-up templates (seed + CRUD + UI)
- [x] Agent accountability dashboard (team performance table)
- [x] Student journey timeline (mapped to real stage values)

## Environment Variables
- `DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

## Current Phase
- Lead heat indicators + WhatsApp logger + templates + accountability + student journey timeline (implemented)

## Known Issues
- Some API/email flows still use `console.error`; should be centralized/handled consistently.

