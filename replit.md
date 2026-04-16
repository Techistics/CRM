# EduCRM — Multi-Tenant Education CRM

A multi-tenant CRM platform for immigration and education consultancies. Built for teams managing student leads across pipeline stages, document checklists, and team assignments.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Auth**: Clerk (keyless dev mode; claim keys at dashboard.clerk.com)
- **Database**: Neon PostgreSQL via Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`
- **Styling**: Tailwind CSS + Radix UI
- **Charts**: Recharts
- **Drag-and-drop**: dnd-kit

## Architecture

```
app/
  t/[tenantSlug]/          # Tenant-scoped pages (admin + pro portals)
    admin/                 # Admin-only views (leads, team, reports, kanban)
    pro/                   # Agent views (overview, leads)
  platform/                # Super-admin platform management
  api/                     # API routes
lib/                       # Server utilities (auth, tenant, storage)
db/
  schema.ts                # Drizzle schema (single source of truth)
  migrations/              # SQL migration files (tracked by Drizzle journal)
```

## Key Conventions

- **Auth**: All auth goes through Clerk. Do NOT migrate to custom JWT. `lib/tenant-api.ts` and `lib/tenant-server.ts` are the primary auth entry points for API routes and server components respectively.
- **Multi-tenancy**: Every piece of workspace data has a `tenantId` column. Never query without scoping to `tenantId`.
- **Boolean columns**: Use native `boolean` Drizzle type, never store booleans as text strings.
- **Storage**: Use `lib/storage.ts` (`uploadFile`) for all file uploads. Configured via R2 env vars.

## Environment Variables

See `.env.local` for all required variables with comments.

Key variables:
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_ROOT_DOMAIN` | Used to build Clerk invite redirect URLs. Must match your Replit dev/prod domain. |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2 storage |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for uploaded files |

## Database Migrations

Migrations live in `db/migrations/` and are tracked by `db/migrations/meta/_journal.json`.

To apply migrations to your Neon database:
```bash
npx drizzle-kit migrate
```

Current migration sequence:
- `0000_purple_clea` — Initial schema
- `0001_far_the_initiative` — Notifications table
- `0002_role_requests` — Role requests table
- `0003_multi_tenant` — Multi-tenant tables (tenants, tenant_members, tenant_id columns)
- `0004_grey_korvac` — Document checklist + reminders
- `0005_lead_uploaded_documents` — File upload records
- `0006_boolean_columns` — Convert text booleans to proper boolean columns

## Implementation Status

### Phase 1 — Critical Fixes (COMPLETE)
- [x] P1-A: Auth direction resolved — KEEP CLERK. `.env.local` created with `NEXT_PUBLIC_ROOT_DOMAIN`.
- [x] P1-B: Deleted orphan migration `0001_multi_tenant.sql` (was not in journal).
- [x] P1-C: Fixed boolean-as-text columns (`required`, `isSubmitted`, `notifications.read`). Migration `0006_boolean_columns.sql` added. All consumers updated.
- [x] P1-D: Added try/catch to `req.json()` in `/api/leads/[id]/stage` and `/api/leads/[id]/assign`.
- [x] P1-E: Replaced `@vercel/blob` with Cloudflare R2 via `lib/storage.ts` and `@aws-sdk/client-s3`.
- [x] P1-F: Deleted dead test page `app/dashboard/page.tsx`.

### Phase 2 — High Priority Features (PENDING — awaiting user confirmation of Phase 1)

### Phase 3 — Medium Priority (PENDING)

### Phase 4 — Education Consultancy Specific (PENDING)
