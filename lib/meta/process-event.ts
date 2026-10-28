/**
 * lib/meta/process-event.ts
 *
 * Processes a single Meta Leadgen webhook event end-to-end:
 *   1. Idempotency guard (processed / duplicate → return early)
 *   2. Load meta_connection; skip if missing / disabled
 *   3. Load meta_form_mapping (optional)
 *   4. Fetch lead from Graph API → map fields
 *   5. createLeadFromMeta
 *   6. Notifications + email (email failure is non-fatal)
 *   7. Stamp event as processed / duplicate
 *
 * On any exception: stamp event as 'failed', increment retry_count, do NOT rethrow.
 *
 * Also exports retryFailedEvents(limit) for future cron/manual use.
 */

import { and, eq, isNull, lt, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  leads,
  metaConnections,
  metaFormMappings,
  metaWebhookEvents,
  notifications,
  tenantMembers,
  tenants,
  users,
} from '@/db/schema'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { createLeadFromMeta } from './create-lead'
import { fetchAdName, fetchFormName, fetchLead } from './graph'
import { DEFAULT_FIELD_MAP, mapMetaFields } from './map-fields'
import type { FieldMap } from './map-fields'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Marks the event with a terminal or error status. Never throws. */
async function stampEvent(
  eventId: string,
  status: 'processed' | 'duplicate' | 'skipped' | 'failed',
  opts: { leadId?: string; error?: string; incrementRetry?: boolean } = {},
) {
  try {
    await db
      .update(metaWebhookEvents)
      .set({
        status,
        leadId: opts.leadId ?? undefined,
        error: opts.error ?? null,
        processedAt: new Date(),
        ...(opts.incrementRetry
          ? { retryCount: sql`${metaWebhookEvents.retryCount} + 1` }
          : {}),
      })
      .where(eq(metaWebhookEvents.id, eventId))
  } catch (stampErr) {
    console.error(`[processMetaEvent] Failed to stamp event ${eventId} as ${status}:`, stampErr)
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Processes one Meta Leadgen webhook event by its UUID.
 * All exceptions are caught; the event is stamped 'failed' and the function
 * returns without rethrowing.
 */
export async function processMetaEvent(eventId: string): Promise<void> {
  // ── 1. Load event ─────────────────────────────────────────────────────────
  let event: {
    id: string
    leadgenId: string
    pageId: string
    formId: string | null
    tenantId: string | null
    status: string
    retryCount: number
  } | undefined

  try {
    const [row] = await db
      .select({
        id: metaWebhookEvents.id,
        leadgenId: metaWebhookEvents.leadgenId,
        pageId: metaWebhookEvents.pageId,
        formId: metaWebhookEvents.formId,
        tenantId: metaWebhookEvents.tenantId,
        status: metaWebhookEvents.status,
        retryCount: metaWebhookEvents.retryCount,
      })
      .from(metaWebhookEvents)
      .where(eq(metaWebhookEvents.id, eventId))
      .limit(1)
    event = row
  } catch (err) {
    console.error(`[processMetaEvent] Failed to load event ${eventId}:`, err)
    return
  }

  if (!event) {
    console.warn(`[processMetaEvent] Event not found: ${eventId}`)
    return
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (event.status === 'processed' || event.status === 'duplicate') {
    return
  }

  try {
    // ── 2. Load meta_connection by page_id ──────────────────────────────────
    const [connection] = await db
      .select({
        id: metaConnections.id,
        tenantId: metaConnections.tenantId,
        pageToken: metaConnections.pageToken,
        defaultFieldMap: metaConnections.defaultFieldMap,
        status: metaConnections.status,
      })
      .from(metaConnections)
      .where(eq(metaConnections.pageId, event.pageId))
      .limit(1)

    if (!connection || connection.status !== 'active') {
      await stampEvent(eventId, 'skipped', { error: 'no active connection' })
      return
    }

    // ── 3. Load meta_form_mapping (optional) ─────────────────────────────────
    // Priority for fieldMap: form field_map > connection default_field_map > DEFAULT_FIELD_MAP
    // Priority for campaignName: mapping.campaign_name > form name [| ad name]
    let campaignName: string | null = null
    let mappingAssigneeId: string | null = null
    let fieldMap: FieldMap = (() => {
      const connMap = connection.defaultFieldMap as Record<string, string> | null
      return connMap && Object.keys(connMap).length > 0
        ? (connMap as FieldMap)
        : DEFAULT_FIELD_MAP
    })()

    if (event.formId) {
      const [mapping] = await db
        .select({
          campaignName: metaFormMappings.campaignName,
          formName: metaFormMappings.formName,
          fieldMap: metaFormMappings.fieldMap,
          assigneeId: metaFormMappings.assigneeId,
        })
        .from(metaFormMappings)
        .where(
          and(
            eq(metaFormMappings.formId, event.formId),
            eq(metaFormMappings.connectionId, connection.id),
          ),
        )
        .limit(1)

      if (mapping) {
        // fieldMap is stored as JSONB; cast to FieldMap if non-empty
        const storedMap = mapping.fieldMap as Record<string, string>
        if (storedMap && Object.keys(storedMap).length > 0) {
          fieldMap = storedMap as FieldMap
        }
        mappingAssigneeId = mapping.assigneeId
        // Resolve campaign name: stored name wins; otherwise use form name
        const formDisplayName = mapping.formName ?? null
        campaignName = mapping.campaignName ?? formDisplayName
      } else {
        // No mapping row yet — fetch the form name non-fatally and auto-insert
        let formName: string | null = null
        try {
          formName = await fetchFormName(event.formId, connection.pageToken)
        } catch {
          // non-fatal — continue without form name
        }

        try {
          await db
            .insert(metaFormMappings)
            .values({
              connectionId: connection.id,
              formId: event.formId,
              formName: formName ?? undefined,
              campaignName: formName ?? undefined,
              fieldMap: {},
            })
            .onConflictDoNothing({ target: metaFormMappings.formId })
        } catch (insertErr) {
          console.error('[processMetaEvent] Failed to auto-insert meta_form_mappings (non-fatal):', insertErr)
        }

        campaignName = formName
      }
    }

    // ── 4. Fetch lead from Graph + map fields ─────────────────────────────────
    const fetchedLead = await fetchLead(event.leadgenId, connection.pageToken)
    const { mapped, unmapped, guessed } = mapMetaFields(fetchedLead.field_data, fieldMap)

    // Append ad name to campaign name if the payload carries an ad_id (non-fatal)
    const adId = (fetchedLead as unknown as Record<string, unknown>).ad_id as string | undefined
    if (adId && campaignName !== null) {
      try {
        const adName = await fetchAdName(adId, connection.pageToken)
        if (adName) {
          campaignName = `${campaignName} | ${adName}`
        }
      } catch {
        // non-fatal — continue without ad name
      }
    } else if (adId && campaignName === null) {
      try {
        const adName = await fetchAdName(adId, connection.pageToken)
        if (adName) {
          campaignName = adName
        }
      } catch {
        // non-fatal
      }
    }

    // ── 5. createLeadFromMeta ─────────────────────────────────────────────────
    const [activeAssignee] = mappingAssigneeId
      ? await db
          .select({ userId: tenantMembers.userId })
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, connection.tenantId),
              eq(tenantMembers.userId, mappingAssigneeId),
              isNull(tenantMembers.deletedAt),
            ),
          )
          .limit(1)
      : []
    const assignedTo = activeAssignee?.userId ?? null
    const result = await createLeadFromMeta({
      tenantId: connection.tenantId,
      assignedTo,
      campaignName,
      fields: mapped,
      rawData: {
        meta: fetchedLead,
        unmapped,
        guessed,
        campaign_name: campaignName,
      },
    })

    const finalStatus = result.status === 'created' ? 'processed' : 'duplicate'

    // ── 6. Notifications + email (created leads only) ─────────────────────────
    if (result.status === 'created') {
      // Load the lead we just created for display fields
      const [createdLead] = await db
        .select({
          id: leads.id,
          fullName: leads.fullName,
          contactNumber: leads.contactNumber,
          email: leads.email,
          stage: leads.stage,
        })
        .from(leads)
        .where(eq(leads.id, result.leadId))
        .limit(1)

      const leadFullName = createdLead?.fullName ?? 'New Lead'
      const leadContactNumber = createdLead?.contactNumber ?? ''
      const leadEmail = createdLead?.email ?? ''
      const leadStage = createdLead?.stage ?? 'new_lead'

      // Load tenant slug for URL building
      const [tenant] = await db
        .select({ slug: tenants.slug, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, connection.tenantId))
        .limit(1)

      const tenantSlug = tenant?.slug ?? ''
      const workspaceName = tenant?.name ?? 'Consulty'
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

      if (assignedTo) {
        // ── 6a. Assigned lead — notify the assignee ────────────────────────
        await db.insert(notifications).values({
          tenantId: connection.tenantId,
          userId: assignedTo,
          title: 'New lead assigned',
          body: `${leadFullName} has been assigned to you`,
          type: 'lead_assigned',
          leadId: result.leadId,
        })

        // Notify all active ADMINs (excluding the assignee themselves)
        const adminMembers = await db
          .select({ userId: tenantMembers.userId })
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, connection.tenantId),
              eq(tenantMembers.role, 'ADMIN'),
              isNull(tenantMembers.deletedAt),
            ),
          )

        for (const admin of adminMembers) {
          if (admin.userId === assignedTo) continue
          await db.insert(notifications).values({
            tenantId: connection.tenantId,
            userId: admin.userId,
            title: 'Lead assigned',
            body: `${leadFullName} has been assigned to a counselor`,
            type: 'lead_assigned',
            leadId: result.leadId,
          })
        }

        // Email the assignee — failure must NOT fail the event
        try {
          const [agent] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, assignedTo))
            .limit(1)

          const [membership] = await db
            .select({ role: tenantMembers.role })
            .from(tenantMembers)
            .where(
              and(
                eq(tenantMembers.tenantId, connection.tenantId),
                eq(tenantMembers.userId, assignedTo),
                isNull(tenantMembers.deletedAt),
              ),
            )
            .limit(1)

          if (agent?.email) {
            const rolePath = membership?.role === 'PRO' ? 'pro' : 'admin'
            const leadUrl = `${baseUrl}/t/${tenantSlug}/${rolePath}/leads/${result.leadId}`
            await sendLeadAssignedEmail({
              agentEmail: agent.email,
              agentName: agent.name ?? 'Counselor',
              leadName: leadFullName,
              contactNumber: leadContactNumber,
              leadEmail,
              stage: leadStage,
              leadUrl,
              workspaceName,
            })
          }
        } catch (emailErr) {
          console.error('[processMetaEvent] Email notification failed (non-fatal):', emailErr)
        }
      } else {
        // ── 6b. Unassigned lead — notify all tenant ADMINs ─────────────────
        const adminMembers = await db
          .select({ userId: tenantMembers.userId })
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, connection.tenantId),
              eq(tenantMembers.role, 'ADMIN'),
              isNull(tenantMembers.deletedAt),
            ),
          )

        for (const admin of adminMembers) {
          await db.insert(notifications).values({
            tenantId: connection.tenantId,
            userId: admin.userId,
            title: 'New Meta lead (unassigned)',
            body: `${leadFullName} came in from Meta Lead Ads and needs an assignee`,
            type: 'lead_assigned',
            leadId: result.leadId,
          })
        }
      }
    }

    // ── 7. Stamp final status ─────────────────────────────────────────────────
    await stampEvent(eventId, finalStatus, { leadId: result.leadId })
  } catch (err) {
    // ── 8. Failure — stamp event, increment retry_count, do NOT rethrow ───────
    const message = err instanceof Error ? err.message : String(err)
    // Guard: never leak a page token into the error column.
    // The token is never included in Error messages from fetchLead, but
    // redact just in case something unexpected bubbles up from elsewhere.
    const safeMessage = message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    console.error(`[processMetaEvent] Error processing event ${eventId}:`, safeMessage)
    await stampEvent(eventId, 'failed', { error: safeMessage, incrementRetry: true })
  }
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Re-runs failed events that haven't exceeded the retry cap (5 attempts).
 * Does NOT wire itself to any cron or route — call explicitly when needed.
 *
 * @param limit Maximum number of events to retry in one call (default 20).
 */
export async function retryFailedEvents(limit = 20): Promise<void> {
  const MAX_RETRIES = 5

  let failedEvents: { id: string }[]
  try {
    failedEvents = await db
      .select({ id: metaWebhookEvents.id })
      .from(metaWebhookEvents)
      .where(
        and(
          eq(metaWebhookEvents.status, 'failed'),
          lt(metaWebhookEvents.retryCount, MAX_RETRIES),
        ),
      )
      .orderBy(metaWebhookEvents.createdAt)
      .limit(limit)
  } catch (err) {
    console.error('[retryFailedEvents] Failed to query failed events:', err)
    return
  }

  console.info(`[retryFailedEvents] Retrying ${failedEvents.length} event(s)`)

  for (const { id } of failedEvents) {
    await processMetaEvent(id)
  }
}
