/**
 * scripts/seed-tiercel-meta.ts
 *
 * Upserts a meta_connections row (by page_id) and a meta_form_mappings row
 * (by form_id) for the Tiercel tenant.
 *
 * Run:
 *   npx tsx scripts/seed-tiercel-meta.ts
 *
 * Required env vars (read from .env / .env.local via dotenv):
 *   DATABASE_URL
 *   TIERCEL_TENANT_SLUG
 *   TIERCEL_PAGE_ID
 *   TIERCEL_PAGE_NAME
 *   TIERCEL_PAGE_TOKEN
 *
 * Optional:
 *   TIERCEL_FORM_ID      – if set, also upserts a meta_form_mappings row
 *   TIERCEL_FORM_NAME    – display name for the form (used when TIERCEL_FORM_ID is set)
 *   TIERCEL_CAMPAIGN     – campaign name (used when TIERCEL_FORM_ID is set)
 *   TIERCEL_ASSIGNEE_EMAIL  – if set, resolves the user and confirms they are
 *                             an active member of the tenant before seeding.
 */

import 'dotenv/config'
import { resolve } from 'path'
import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq, and, isNull } from 'drizzle-orm'

// Load .env.local in addition to .env (Next.js convention)
config({ path: resolve(process.cwd(), '.env.local'), override: false })

import * as schema from '../db/schema'

// ─── Env validation ────────────────────────────────────────────────────────────

const REQUIRED_VARS = [
  'DATABASE_URL',
  'TIERCEL_TENANT_SLUG',
  'TIERCEL_PAGE_ID',
  'TIERCEL_PAGE_NAME',
  'TIERCEL_PAGE_TOKEN',
] as const

const missing = REQUIRED_VARS.filter((v) => !process.env[v])
if (missing.length > 0) {
  console.error(
    `\n❌  Missing required environment variable(s):\n   ${missing.join('\n   ')}\n\nSet them in .env or .env.local and retry.\n`,
  )
  process.exit(1)
}

const env = {
  databaseUrl:    process.env.DATABASE_URL!,
  tenantSlug:     process.env.TIERCEL_TENANT_SLUG!,
  pageId:         process.env.TIERCEL_PAGE_ID!,
  pageName:       process.env.TIERCEL_PAGE_NAME!,
  // pageToken is used but NEVER printed
  pageToken:      process.env.TIERCEL_PAGE_TOKEN!,
  formId:         process.env.TIERCEL_FORM_ID ?? null,
  formName:       process.env.TIERCEL_FORM_NAME ?? null,
  campaign:       process.env.TIERCEL_CAMPAIGN ?? null,
  assigneeEmail:  process.env.TIERCEL_ASSIGNEE_EMAIL ?? null,
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: env.databaseUrl })
const db = drizzle(pool, { schema })

// ─── Helpers ──────────────────────────────────────────────────────────────────



// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  seed-tiercel-meta starting…\n')

  // 1. Resolve tenant by slug (same predicate as requireTenantFromApiHeaders:
  //    slug match + deletedAt IS NULL + status active)
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(
      and(
        eq(schema.tenants.slug, env.tenantSlug),
        isNull(schema.tenants.deletedAt),
      ),
    )

  if (!tenant) {
    console.error(`❌  No tenant found with slug "${env.tenantSlug}" (or it is soft-deleted).`)
    process.exit(1)
  }
  if (tenant.status !== 'active') {
    console.error(
      `❌  Tenant "${tenant.name}" (slug: ${env.tenantSlug}) exists but its status is "${tenant.status}". Aborting.`,
    )
    process.exit(1)
  }
  console.log(`✅  Tenant resolved: "${tenant.name}" (id: ${tenant.id})`)

  // 2. Optionally resolve assignee and confirm membership
  let assigneeId: string | null = null
  if (env.assigneeEmail) {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, env.assigneeEmail))

    if (!user) {
      console.error(`❌  No user found with email "${env.assigneeEmail}".`)
      process.exit(1)
    }

    // Confirm active membership (deletedAt IS NULL means not soft-removed)
    const [membership] = await db
      .select()
      .from(schema.tenantMembers)
      .where(
        and(
          eq(schema.tenantMembers.tenantId, tenant.id),
          eq(schema.tenantMembers.userId, user.id),
          isNull(schema.tenantMembers.deletedAt),
        ),
      )

    if (!membership) {
      console.error(
        `❌  User "${env.assigneeEmail}" is not an active member of tenant "${tenant.name}".`,
      )
      process.exit(1)
    }

    assigneeId = user.id
    console.log(
      `✅  Assignee resolved: "${user.name}" <${user.email}> (role: ${membership.role})`,
    )
  }

  // 3. Upsert meta_connections by page_id
  const connectionValues = {
    tenantId:          tenant.id,
    pageId:            env.pageId,
    pageName:          env.pageName,
    pageToken:         env.pageToken,        // stored, never printed below
    defaultAssigneeId: assigneeId,
    status:            'active' as const,
    updatedAt:         new Date(),
  }

  const [upsertedConnection] = await db
    .insert(schema.metaConnections)
    .values(connectionValues)
    .onConflictDoUpdate({
      target: schema.metaConnections.pageId,
      set: {
        pageName:          connectionValues.pageName,
        pageToken:         connectionValues.pageToken,
        defaultAssigneeId: connectionValues.defaultAssigneeId,
        status:            connectionValues.status,
        updatedAt:         connectionValues.updatedAt,
      },
    })
    .returning()

  console.log(
    `✅  meta_connections upserted:\n` +
    `    id         : ${upsertedConnection.id}\n` +
    `    page_id    : ${upsertedConnection.pageId}\n` +
    `    page_name  : ${upsertedConnection.pageName}\n` +
    `    page_token : token: set\n` +
    `    status     : ${upsertedConnection.status}\n` +
    `    assignee_id: ${upsertedConnection.defaultAssigneeId ?? '(none)'}`,
  )

  // 4. Optionally upsert meta_form_mappings by form_id
  if (env.formId) {
    //    field_map starts as {} (empty) per spec; on conflict we do NOT clobber
    //    any existing field_map the operator may have configured — only update
    //    mutable metadata fields.
    const formValues = {
      connectionId: upsertedConnection.id,
      formId:       env.formId,
      formName:     env.formName ?? undefined,
      campaignName: env.campaign ?? undefined,
      fieldMap:     {},
    }

    const [upsertedForm] = await db
      .insert(schema.metaFormMappings)
      .values(formValues)
      .onConflictDoUpdate({
        target: schema.metaFormMappings.formId,
        set: {
          connectionId: formValues.connectionId,
          formName:     formValues.formName,
          campaignName: formValues.campaignName,
          // fieldMap is intentionally NOT overwritten to preserve any operator
          // mappings that may already exist.
        },
      })
      .returning()

    console.log(
      `✅  meta_form_mappings upserted:\n` +
      `    id           : ${upsertedForm.id}\n` +
      `    form_id      : ${upsertedForm.formId}\n` +
      `    form_name    : ${upsertedForm.formName}\n` +
      `    campaign     : ${upsertedForm.campaignName}\n` +
      `    connection_id: ${upsertedForm.connectionId}\n` +
      `    field_map    : ${JSON.stringify(upsertedForm.fieldMap)} (preserved existing or initialized to {})`,
    )
  } else {
    console.log('ℹ️   TIERCEL_FORM_ID not set — skipping meta_form_mappings upsert.')
  }


  console.log('\n🎉  Done.\n')
  await pool.end()
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err)
  pool.end().finally(() => process.exit(1))
})
