import { after } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { metaConnections, metaWebhookEvents } from '@/db/schema'
import { verifyMetaSignature } from '@/lib/meta/verify-signature'
import { processMetaEvent } from '@/lib/meta/process-event'

// ─── GET — webhook verification (unchanged) ───────────────────────────────────

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.META_VERIFY_TOKEN
  ) {
    return new Response(p.get('hub.challenge'), { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaLeadgenChangeValue {
  leadgen_id: string
  page_id: string
  form_id?: string
  ad_id?: string
  created_time?: number
}

interface MetaWebhookChange {
  field: string
  value: MetaLeadgenChangeValue
}

interface MetaWebhookEntry {
  id: string // entry id (page id)
  changes: MetaWebhookChange[]
}

interface MetaWebhookPayload {
  object: string
  entry: MetaWebhookEntry[]
}

// ─── POST — webhook event ingestion ───────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Read raw body BEFORE JSON.parse ──────────────────────────────────────
  const raw = await req.text()

  // ── 2. Signature verification ───────────────────────────────────────────────
  const sigHeader = req.headers.get('x-hub-signature-256')
  if (!verifyMetaSignature(raw, sigHeader)) {
    console.warn('[meta-lead webhook] Invalid or missing signature — returning 401')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 3. Always return 200 after a valid signature (Meta retries on non-2xx) ──
  //    All processing happens inside after() so it cannot delay this response.

  after(async () => {
    try {
      // ── 3a. Parse payload ──────────────────────────────────────────────────
      let payload: MetaWebhookPayload
      try {
        payload = JSON.parse(raw) as MetaWebhookPayload
      } catch (parseErr) {
        console.error('[meta-lead webhook] Failed to parse JSON body:', parseErr)
        return
      }

      const entries: MetaWebhookEntry[] = Array.isArray(payload?.entry)
        ? payload.entry
        : []

      for (const entry of entries) {
        const changes: MetaWebhookChange[] = Array.isArray(entry?.changes)
          ? entry.changes
          : []

        for (const change of changes) {
          if (change.field !== 'leadgen') continue

          const value = change.value as MetaLeadgenChangeValue
          const { leadgen_id, page_id, form_id, ad_id, created_time } = value

          if (!leadgen_id || !page_id) {
            console.warn('[meta-lead webhook] Skipping change with missing leadgen_id or page_id')
            continue
          }

          // ── 3b. Look up tenant via page_id ──────────────────────────────
          // Done BEFORE insert so we can set tenant_id in a single query.
          let tenantId: string | null = null
          try {
            const [conn] = await db
              .select({ tenantId: metaConnections.tenantId })
              .from(metaConnections)
              .where(eq(metaConnections.pageId, page_id))
              .limit(1)
            tenantId = conn?.tenantId ?? null
          } catch (lookupErr) {
            // Non-fatal: we still insert the raw event; processing will retry.
            console.error(
              `[meta-lead webhook] Failed to look up meta_connection for page_id=${page_id}:`,
              lookupErr,
            )
          }

          // ── 3c. Persist raw event (idempotent) ───────────────────────────
          // onConflictDoNothing on leadgen_id unique constraint ensures Meta
          // retries are harmless.
          const eventPayload = {
            leadgen_id,
            page_id,
            form_id: form_id ?? null,
            ad_id: ad_id ?? null,
            created_time: created_time ?? null,
            entry_id: entry.id,
          }

          let eventId: string | null = null
          try {
            const inserted = await db
              .insert(metaWebhookEvents)
              .values({
                leadgenId: leadgen_id,
                pageId: page_id,
                formId: form_id ?? null,
                tenantId: tenantId ?? null,
                payload: eventPayload,
                status: 'received',
              })
              .onConflictDoNothing()
              .returning({ id: metaWebhookEvents.id })

            eventId = inserted[0]?.id ?? null

            if (!eventId) {
              // Row already existed (duplicate delivery from Meta) — skip.
              console.info(
                `[meta-lead webhook] Duplicate delivery ignored for leadgen_id=${leadgen_id}`,
              )
              continue
            }
          } catch (insertErr) {
            console.error(
              `[meta-lead webhook] Failed to insert event for leadgen_id=${leadgen_id}:`,
              insertErr,
            )
            continue
          }

          // ── 3d. Trigger downstream processing ────────────────────────────
          await processMetaEvent(eventId)
        }
      }
    } catch (outerErr) {
      // Catch-all: log without leaking tokens or full PII.
      console.error('[meta-lead webhook] Unhandled error in after() callback:', outerErr)
    }
  })

  return Response.json({ ok: true }, { status: 200 })
}