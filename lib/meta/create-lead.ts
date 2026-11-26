/**
 * lib/meta/create-lead.ts
 *
 * Reusable server-side helper for creating a lead from a Meta (Facebook /
 * Instagram) Lead Ads webhook.  Called by the webhook handler; has no HTTP
 * dependency so it can also be used from scripts or background jobs.
 *
 * Logic mirrors:
 *   - app/api/leads/route.ts  (POST)  — display_id, stage defaults, sub-status seed
 *   - app/api/leads/import/route.ts   — phone normalisation, dedupe pattern
 */

import { and, eq, isNull, or, type SQL } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { DEFAULT_SUB_STATUSES } from '@/constants/sub-status-defaults'
import { db } from '@/db'
import {
  leadActivities,
  leads,
  leadStageAssignments,
  pipelineSubStatuses,
  tenantMembers,
} from '@/db/schema'
import { normalizePhone, phoneMatchCondition } from '@/lib/leads/phone'
import { getTenantPipeline } from '@/lib/pipeline/config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateLeadFromMetaInput {
  tenantId: string
  /** UUID of the CRM user to assign the lead to; may be null. */
  assignedTo: string | null
  /** Campaign name from the Meta form mapping; stored in raw_data only. */
  campaignName: string | null
  fields: Partial<{
    fullName: string
    contactNumber: string
    email: string
    city: string
    country: string
    destinationCountry: string
    programOfInterest: string
    lastQualification: string
    grades: string
    tuitionBudget: string
    englishTest: string
  }>
  /** Raw webhook payload — stored as-is in leads.raw_data. */
  rawData: unknown
}

export type CreateLeadFromMetaResult =
  | { status: 'created'; leadId: string }
  | { status: 'duplicate'; leadId: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a display_id of the form "AB1234".
 *
 * Source: app/api/leads/route.ts › POST and app/api/leads/import/route.ts › confirm
 */
function generateDisplayId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nums = '0123456789'
  let id = ''
  for (let i = 0; i < 2; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  for (let i = 0; i < 4; i++) id += nums.charAt(Math.floor(Math.random() * nums.length))
  return id
}

/**
 * Returns the first in-progress sub-status for the given stage, seeding
 * defaults if none exist yet.
 *
 * Source: app/api/leads/import/route.ts › ensureDefaultSubStatus
 */
async function ensureDefaultSubStatus(tenantId: string, stageKey: string) {
  let [firstSubStatus] = await db
    .select({ id: pipelineSubStatuses.id, closedActions: pipelineSubStatuses.closedActions })
    .from(pipelineSubStatuses)
    .where(
      and(
        eq(pipelineSubStatuses.tenantId, tenantId),
        eq(pipelineSubStatuses.stageKey, stageKey),
        eq(pipelineSubStatuses.type, 'in_progress'),
      ),
    )
    .orderBy(pipelineSubStatuses.sortOrder)
    .limit(1)

  if (!firstSubStatus) {
    const rows: (typeof pipelineSubStatuses.$inferInsert)[] = []
    for (const [sKey, subStatuses] of Object.entries(DEFAULT_SUB_STATUSES)) {
      subStatuses.forEach((ss, index) => {
        rows.push({
          tenantId,
          stageKey: sKey,
          label: ss.label,
          type: ss.type,
          closedActions: ss.closedActions,
          sortOrder: index,
        })
      })
    }
    if (rows.length > 0) {
      await db.insert(pipelineSubStatuses).values(rows).onConflictDoNothing()
      const [seededFirst] = await db
        .select({ id: pipelineSubStatuses.id, closedActions: pipelineSubStatuses.closedActions })
        .from(pipelineSubStatuses)
        .where(
          and(
            eq(pipelineSubStatuses.tenantId, tenantId),
            eq(pipelineSubStatuses.stageKey, stageKey),
            eq(pipelineSubStatuses.type, 'in_progress'),
          ),
        )
        .orderBy(pipelineSubStatuses.sortOrder)
        .limit(1)
      firstSubStatus = seededFirst
    }
  }

  return {
    defaultSubStatusId: firstSubStatus?.id ?? null,
    defaultClosedAction: (firstSubStatus?.closedActions as string[])?.[0] ?? null,
  }
}

/**
 * Returns the userId of the first active ADMIN member of the tenant.
 * Used as a fallback system actor when no assignedTo is provided.
 */
async function getFirstAdminUserId(tenantId: string): Promise<string | null> {
  const [member] = await db
    .select({ userId: tenantMembers.userId })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'ADMIN'),
        isNull(tenantMembers.deletedAt),
      ),
    )
    .limit(1)
  return member?.userId ?? null
}

// ─── Unique-constraint error detection ────────────────────────────────────────

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  // Direct code (postgres.js, node-postgres with pg@8+)
  if ('code' in err && (err as { code: unknown }).code === '23505') return true
  // Wrapped cause — some drivers (e.g. Drizzle ORM neon-http adapter) nest the
  // original PG error under err.cause.
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object' && 'code' in cause) {
    return (cause as { code: unknown }).code === '23505'
  }
  return false
}

// ─── Duplicate handling ───────────────────────────────────────────────────────

/**
 * Handles the "this lead already exists" branch: logs the duplicate against the
 * existing lead and returns the `'duplicate'` result so callers can stamp the
 * webhook event accordingly.
 *
 * The existing row is never rewritten except for a campaign back-fill: when it
 * has no `raw_data.campaign_name` and this event carries one, the campaign
 * name/id are merged into its `raw_data`. `contact_number` and `email` keep
 * whatever formatting the row was stored with.
 */
async function resolveDuplicate(input: {
  tenantId: string
  actorUserId: string | null
  existing: { id: string; rawData: unknown }
  campaignName: string | null
  incomingCampaignId: string | null
}): Promise<CreateLeadFromMetaResult> {
  const { tenantId, actorUserId, existing, campaignName, incomingCampaignId } = input

  console.log(
    `[createLeadFromMeta] Duplicate lead ${existing.id} (campaign: ${campaignName ?? 'unknown'}) — reusing existing lead`,
  )

  const existingRawData =
    existing.rawData && typeof existing.rawData === 'object' && !Array.isArray(existing.rawData)
      ? (existing.rawData as Record<string, unknown>)
      : {}

  if (!existingRawData.campaign_name && (campaignName || incomingCampaignId)) {
    try {
      await db
        .update(leads)
        .set({
          rawData: {
            ...existingRawData,
            ...(campaignName ? { campaign_name: campaignName } : {}),
            ...(incomingCampaignId ? { campaign_id: incomingCampaignId } : {}),
          },
        })
        .where(eq(leads.id, existing.id))
    } catch (mergeErr) {
      // Non-fatal: the duplicate result still stands.
      console.error('[createLeadFromMeta] Failed to back-fill campaign data:', mergeErr)
    }
  }

  // actorUserId may still be null if the tenant has no members at all —
  // guard to avoid a NOT NULL violation on leadActivities.userId.
  if (actorUserId) {
    try {
      await db.insert(leadActivities).values({
        tenantId,
        leadId: existing.id,
        userId: actorUserId,
        type: 'note' as const,
        note: 'Duplicate Meta lead received',
      })
    } catch (activityErr) {
      // Non-fatal: log but don't fail the overall result.
      console.error('[createLeadFromMeta] Failed to insert duplicate activity note:', activityErr)
    }
  }

  return { status: 'duplicate', leadId: existing.id }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Creates a CRM lead from a Meta Lead Ads webhook event.
 *
 * Decision log
 * ────────────
 * created_by:
 *   `leads.created_by` is NULLABLE in the schema (no `.notNull()` on line 186
 *   of db/schema.ts).  We therefore pass `assignedTo` when present, otherwise
 *   fall back to the tenant's first ADMIN member so the activity log always has
 *   a valid actor (leadActivities.userId IS NOT NULL).
 *
 * campaign_name:
 *   `leads` has no campaign column.  We store it in `raw_data.campaign_name`
 *   as instructed.  A cleaner long-term option would be to create a
 *   `meta_imports` row (analogous to `csv_imports`) and link it via a nullable
 *   `meta_import_id` FK on `leads` — that would make campaign filtering via
 *   SQL joins consistent with the CSV import pattern.  This is left for a
 *   future migration.
 */
export async function createLeadFromMeta(
  input: CreateLeadFromMetaInput,
): Promise<CreateLeadFromMetaResult> {
  const { tenantId, assignedTo, campaignName, fields, rawData } = input

  // ── 1. Resolve system actor ──────────────────────────────────────────────
  // We need a non-null userId for leadActivities rows.
  // Prefer assignedTo (already a valid tenant member), fall back to first ADMIN.
  const actorUserId = assignedTo ?? (await getFirstAdminUserId(tenantId))

  // ── 2. Normalise inputs ──────────────────────────────────────────────────
  const fullName = fields.fullName?.trim() || 'Meta Lead'

  const contactNumber = normalizePhone(fields.contactNumber)

  const rawEmail = fields.email?.trim().toLowerCase() ?? ''
  const email = rawEmail.length > 0 ? rawEmail : null

  // Build raw_data: merge caller's rawData with campaign_name so it's visible
  // in a single JSONB field without a dedicated column.
  const enrichedRawData = {
    ...(rawData && typeof rawData === 'object' ? rawData : { _raw: rawData }),
    ...(campaignName ? { campaign_name: campaignName } : {}),
  }

  // ── 3. Dedupe check ──────────────────────────────────────────────────────
  // Match on email OR phone within the tenant, excluding soft-deleted rows.
  // The phone predicate is format-tolerant (see phoneMatchCondition) so a
  // lead stored as "0325…" is still recognised when Meta sends "+92325…".
  const incomingCampaignId =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? (rawData as Record<string, unknown>).campaign_id
      : null

  const dedupeConditions = [
    email ? eq(leads.email, email) : undefined,
    phoneMatchCondition(contactNumber) ?? undefined,
  ].filter((condition): condition is SQL => condition !== undefined)

  if (dedupeConditions.length > 0) {
    const [existing] = await db
      .select({ id: leads.id, rawData: leads.rawData })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          isNull(leads.deletedAt),
          or(...dedupeConditions),
        ),
      )
      .limit(1)

    if (existing) {
      return resolveDuplicate({
        tenantId,
        actorUserId,
        existing,
        campaignName,
        incomingCampaignId: typeof incomingCampaignId === 'string' ? incomingCampaignId : null,
      })
    }
  }

  // ── 4. Pipeline + sub-status ─────────────────────────────────────────────
  const pipeline = await getTenantPipeline(tenantId)
  // Use the first pipeline stage as the default (same as import route).
  const defaultStageKey = pipeline.stages[0]?.key ?? 'new_lead'

  const { defaultSubStatusId, defaultClosedAction } = await ensureDefaultSubStatus(
    tenantId,
    defaultStageKey,
  )

  // ── 5. Insert with display_id collision retry ────────────────────────────
  const MAX_RETRIES = 5
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const displayId = generateDisplayId()

    try {
      const leadId = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(leads)
          .values({
            displayId,
            tenantId,
            fullName,
            contactNumber,
            email,
            city: fields.city?.trim() || null,
            country: fields.country?.trim() || DEFAULT_LEAD_COUNTRY,
            destinationCountry: fields.destinationCountry?.trim() || null,
            programOfInterest: fields.programOfInterest?.trim() || null,
            lastQualification: fields.lastQualification?.trim() || null,
            grades: fields.grades?.trim() || null,
            tuitionBudget: fields.tuitionBudget?.trim() || null,
            englishTest: fields.englishTest?.trim() || null,
            source: 'meta_lead',
            rawData: enrichedRawData,
            primaryStage: defaultStageKey,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stage: defaultStageKey as any,
            subStatusId: defaultSubStatusId,
            closedAction: defaultClosedAction,
            assignedTo: assignedTo ?? null,
            // created_by is nullable per schema; use assignedTo or first admin.
            createdBy: assignedTo ?? actorUserId ?? null,
            updatedAt: new Date(),
          })
          .returning({ id: leads.id })

        await tx.insert(leadStageAssignments).values({
          tenantId,
          leadId: row.id,
          stageKey: defaultStageKey,
          // leadStageAssignments.createdBy is nullable (set null on delete).
          createdBy: assignedTo ?? actorUserId ?? null,
        })

        return row.id
      })

      return { status: 'created', leadId }
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Extract constraint name from the error or its wrapped cause.
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
        const causeObj =
          errObj.cause && typeof errObj.cause === 'object'
            ? (errObj.cause as Record<string, unknown>)
            : {}
        const constraintName = String(
          errObj.constraint ?? causeObj.constraint ?? '',
        )

        const isEmailOrPhoneRace =
          constraintName === 'unq_leads_email_tenant' ||
          constraintName === 'unq_leads_phone_tenant'

        if (isEmailOrPhoneRace) {
          // A concurrent insert beat us — treat as duplicate.
          // Guard: if both email and phone are null we have no conditions to
          // query on, so skip the lookup and fall through to a display_id retry.
          if (dedupeConditions.length > 0) {
            const raceDedupe = await db
              .select({ id: leads.id, rawData: leads.rawData })
              .from(leads)
              .where(
                and(
                  eq(leads.tenantId, tenantId),
                  isNull(leads.deletedAt),
                  or(...dedupeConditions),
                ),
              )
              .limit(1)

            const raceLead = raceDedupe[0]
            if (!raceLead) {
              throw new Error('duplicate race: existing lead not found')
            }
            return resolveDuplicate({
              tenantId,
              actorUserId,
              existing: raceLead,
              campaignName,
              incomingCampaignId: typeof incomingCampaignId === 'string' ? incomingCampaignId : null,
            })
          }
          // No dedupe conditions — can't be an email/phone race in practice;
          // fall through to retry the insert with a fresh display_id.
        }

        // display_id collision (or email/phone race with no conditions) —
        // retry with a new id.
        lastError = err
        continue
      }

      // Non-unique error — rethrow immediately.
      throw err
    }
  }

  // Exhausted retries (extremely unlikely: 1 in 26²×10⁴ ≈ 1-in-6.7M chance per attempt).
  throw new Error(
    `[createLeadFromMeta] Failed to generate a unique display_id after ${MAX_RETRIES} attempts`,
    { cause: lastError },
  )
}
