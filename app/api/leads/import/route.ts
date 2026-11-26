import { NextRequest } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { csvImports, leads, tenantMembers, users, leadStageAssignments, pipelineSubStatuses, leadActivities } from '@/db/schema'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requirePermissionApi } from '@/lib/tenant-api'
import { getTenantPipeline } from '@/lib/pipeline/config'
import { DEFAULT_SUB_STATUSES } from '@/constants/sub-status-defaults'
import {
  applyImportColumnMapping,
  CRM_IMPORT_FIELDS,
  type ImportFieldKey,
  suggestColumnMapping,
} from '@/lib/leads/import-fields'
import { normalizePhone, phoneMatchCondition, phoneMatchKey } from '@/lib/leads/phone'

const filePayloadSchema = z.object({
  fileData: z.string().min(1),
  fileName: z.string().min(1),
  tenantSlug: z.string().min(1),
})

const detectBodySchema = filePayloadSchema.extend({
  action: z.literal('detect'),
})

const parseBodySchema = filePayloadSchema.extend({
  action: z.literal('parse'),
  columnMapping: z.record(z.string(), z.string()),
})

const parsedLeadSchema = z.object({
  fullName: z.string().min(1),
  contactNumber: z.string(),
  email: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  stage: z.string(),
  source: z.string().optional().nullable(),
  dealValue: z.number().optional().nullable(),
  dealCurrency: z.string().optional().nullable(),
  activityNote: z.string().optional().nullable(),
  destinationCountry: z.string().optional().nullable(),
  programOfInterest: z.string().optional().nullable(),
  intakeMonth: z.string().optional().nullable(),
  intakeYear: z.string().optional().nullable(),
  lastQualification: z.string().optional().nullable(),
  grades: z.string().optional().nullable(),
  tuitionBudget: z.string().optional().nullable(),
  englishTest: z.string().optional().nullable(),
})

const confirmBodySchema = z.object({
  action: z.literal('confirm'),
  parsedData: z.array(parsedLeadSchema),
  agentAssignments: z.array(z.object({
    agentId: z.string().uuid(),
    count: z.number().int().min(0),
  })),
  tenantSlug: z.string().min(1),
  fileName: z.string().optional(),
  campaignName: z.string().optional().nullable(),
  totalRows: z.number().optional(),
  duplicateRows: z.number().optional(),
  errorRows: z.number().optional(),
})

function normalizeStageValue(value: unknown): string | null {
  const stageRaw = String(value ?? '').trim().toLowerCase()
  if (!stageRaw) return null
  const compact = stageRaw.replace(/[\s_-]+/g, ' ').trim()
  if (!compact) return null

  if (compact === 'new' || compact === 'new lead' || compact === 'new_lead') return 'new_lead'
  if (compact === 'contacted' || compact === 'contact') return 'contacted'
  if (compact === 'follow up' || compact === 'follow_up' || compact === 'followup') return 'follow_up'
  if (compact === 'walk in' || compact === 'walkin' || compact === 'walkin booked' || compact === 'walk-in' || compact === 'walkin_booked') return 'walkin_booked'
  if (compact === 'docs' || compact === 'documents' || compact === 'docs received' || compact === 'docs_received') return 'docs_received'
  if (compact === 'options' || compact === 'options sent' || compact === 'options_sent') return 'options_sent'
  if (compact === 'paid' || compact === 'won' || compact === 'closed') return 'paid'
  if (compact === 'lost' || compact === 'cancelled' || compact === 'canceled') return 'cancelled'

  return null
}

function resolveStageValue(
  value: unknown,
  pipeline: Awaited<ReturnType<typeof getTenantPipeline>>,
): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = normalizeStageValue(value)
  if (normalized && pipeline.stageKeys.has(normalized)) return normalized

  const lower = raw.toLowerCase()
  const byKey = pipeline.stages.find((s) => s.key.toLowerCase() === lower)
  if (byKey) return byKey.key

  const compact = lower.replace(/[\s_-]+/g, ' ').trim()
  const byLabel = pipeline.stages.find(
    (s) => s.label.toLowerCase().replace(/[\s_-]+/g, ' ').trim() === compact,
  )
  if (byLabel) return byLabel.key

  return null
}

function parseRows(fileName: string, fileData: string): Record<string, unknown>[] {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.csv')) {
    const csvContent = Buffer.from(fileData, 'base64').toString('utf-8')
    const parsed = Papa.parse<Record<string, unknown>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })
    return parsed.data
  }

  if (lowerName.endsWith('.xlsx')) {
    const buffer = Buffer.from(fileData, 'base64')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
  }

  throw new Error('Unsupported file type')
}

function parseIntakeMonth(raw: string): number | null {
  const num = parseInt(raw, 10)
  if (!isNaN(num) && num >= 1 && num <= 12) return num
  return null
}

function parseIntakeYear(raw: string): number | null {
  const num = parseInt(raw, 10)
  if (!isNaN(num) && num >= 2000 && num <= 2100) return num
  return null
}

function parseDealValue(raw: string): number | null {
  const num = parseFloat(raw.replace(/,/g, ''))
  if (!isNaN(num) && num > 0) return num
  return null
}

const DEAL_CURRENCIES = new Set(['USD', 'GBP', 'EUR', 'PKR', 'AED', 'CAD', 'AUD'])

function parseDealCurrency(raw: string): string | null {
  const upper = raw.trim().toUpperCase()
  return DEAL_CURRENCIES.has(upper) ? upper : null
}

async function ensureDefaultSubStatus(tenantId: string, defaultStageKey: string) {
  let [firstSubStatus] = await db
    .select({ id: pipelineSubStatuses.id, closedActions: pipelineSubStatuses.closedActions })
    .from(pipelineSubStatuses)
    .where(
      and(
        eq(pipelineSubStatuses.tenantId, tenantId),
        eq(pipelineSubStatuses.stageKey, defaultStageKey),
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
            eq(pipelineSubStatuses.stageKey, defaultStageKey),
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

// ─── Existing-lead lookup (shared by preview + confirm) ───────────────────────

type ExistingLeadMatch = { leadId: string; matchedOn: 'email' | 'phone' }

/** Columns selected by the existing-lead lookup, shared by both phases. */
const existingLeadColumns = {
  id: leads.id,
  contactNumber: leads.contactNumber,
  email: leads.email,
  // Legacy rows are not necessarily E.164 — the digits let us pair them in JS.
  digits: sql<string>`regexp_replace(coalesce(${leads.contactNumber}, ''), '\\D', '', 'g')`,
}

/**
 * Builds the "is this row already in the CRM?" predicate for a batch of
 * normalised phones / emails: same tenant, soft-deleted rows excluded, and the
 * same keys in both phases (email OR format-tolerant phone).
 *
 * Returns `null` when there is nothing to look up.
 */
function existingLeadWhere(
  tenantId: string,
  phones: string[],
  emails: string[],
): SQL | null {
  const uniquePhones = [...new Set(phones)]
  const uniqueEmails = [...new Set(emails)]

  if (uniquePhones.length === 0 && uniqueEmails.length === 0) return null

  const parts: SQL[] = []

  const phoneConditions = uniquePhones
    .map((phone) => phoneMatchCondition(phone))
    .filter((condition): condition is SQL => condition !== null)
  const phonePart = phoneConditions.length > 0 ? or(...phoneConditions) : undefined
  if (phonePart) parts.push(phonePart)

  if (uniqueEmails.length > 0) parts.push(inArray(leads.email, uniqueEmails))

  return and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt), or(...parts)) ?? null
}

/**
 * Pairs each incoming row with a lead that already exists. The preview phase
 * reports these rows as duplicates and the confirm phase updates them instead
 * of inserting — sharing this mapping keeps the two phases in lockstep.
 */
function matchExistingLeads(
  rows: ReadonlyArray<{ contactNumber?: string | null; email?: string | null }>,
  existingLeads: Array<{
    id: string
    contactNumber: string | null
    email: string | null
    digits: string | null
  }>,
): Map<number, ExistingLeadMatch> {
  const byPhoneKey = new Map<string, string>()
  const byEmailKey = new Map<string, string>()

  for (const lead of existingLeads) {
    const phoneKey = phoneMatchKey(lead.digits ?? lead.contactNumber)
    if (phoneKey && !byPhoneKey.has(phoneKey)) byPhoneKey.set(phoneKey, lead.id)

    const emailKey = lead.email?.trim().toLowerCase()
    if (emailKey && !byEmailKey.has(emailKey)) byEmailKey.set(emailKey, lead.id)
  }

  const matches = new Map<number, ExistingLeadMatch>()

  rows.forEach((row, index) => {
    const phoneKey = row.contactNumber ? phoneMatchKey(row.contactNumber) : null
    const phoneMatch = phoneKey ? byPhoneKey.get(phoneKey) : undefined
    if (phoneMatch) {
      matches.set(index, { leadId: phoneMatch, matchedOn: 'phone' })
      return
    }

    const emailKey = row.email?.trim().toLowerCase()
    const emailMatch = emailKey ? byEmailKey.get(emailKey) : undefined
    if (emailMatch) matches.set(index, { leadId: emailMatch, matchedOn: 'email' })
  })

  return matches
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('import.leads')
    if (!ctx.ok) return ctx.response

    const pipeline = await getTenantPipeline(ctx.tenant.id)
    if (pipeline.stages.length === 0) {
      return errorResponse('Pipeline not configured', 'PIPELINE_NOT_CONFIGURED', 409)
    }
    const defaultStageKey = pipeline.stages[0]?.key ?? 'new_lead'

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    if (body.action === 'detect') {
      const parsed = detectBodySchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
      }
      if (parsed.data.tenantSlug !== ctx.tenant.slug) {
        return errorResponse('Forbidden', 'FORBIDDEN', 403)
      }

      let rawRows: Record<string, unknown>[] = []
      try {
        rawRows = parseRows(parsed.data.fileName, parsed.data.fileData)
      } catch {
        return errorResponse('Only CSV and XLSX are supported', 'INVALID_FILE_TYPE', 400)
      }

      const headers =
        rawRows.length > 0
          ? Object.keys(rawRows[0] ?? {})
          : []

      return successResponse({
        fileName: parsed.data.fileName,
        headers,
        totalRows: rawRows.length,
        suggestedMapping: suggestColumnMapping(headers),
        fields: CRM_IMPORT_FIELDS,
        pipelineStages: pipeline.stages.map((s) => ({ key: s.key, label: s.label })),
      })
    }

    if (body.action === 'parse') {
      const parsed = parseBodySchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
      }
      if (parsed.data.tenantSlug !== ctx.tenant.slug) {
        return errorResponse('Forbidden', 'FORBIDDEN', 403)
      }

      const columnMapping = parsed.data.columnMapping as Record<string, ImportFieldKey>
      const hasFullNameMapping = Object.values(columnMapping).includes('fullName')
      if (!hasFullNameMapping) {
        return errorResponse('Map at least one CSV column to Full Name', 'VALIDATION_ERROR', 400)
      }

      let rawRows: Record<string, unknown>[] = []
      try {
        rawRows = parseRows(parsed.data.fileName, parsed.data.fileData)
      } catch {
        return errorResponse('Only CSV and XLSX are supported', 'INVALID_FILE_TYPE', 400)
      }

      const errors: Array<{ row: number; field: string; message: string }> = []
      const parsedRows: Array<z.infer<typeof parsedLeadSchema> & { rowNumber: number }> = []

      rawRows.forEach((row, idx) => {
        const rowNumber = idx + 2
        const { mapped, activityNote } = applyImportColumnMapping(row, columnMapping)

        const fullName = String(mapped.fullName ?? '').trim()
        if (fullName.length < 2) {
          errors.push({ row: rowNumber, field: 'fullName', message: 'Name is required' })
          return
        }

        const contactNumberRaw = String(mapped.contactNumber ?? '').trim()
        const contactNumber = normalizePhone(contactNumberRaw)

        const emailRaw = String(mapped.email ?? '').trim()
        const email =
          emailRaw.length > 0 && z.string().email().safeParse(emailRaw).success
            ? emailRaw.toLowerCase()
            : null

        const stageResolved = resolveStageValue(mapped.stage, pipeline)
        const stage = stageResolved ?? defaultStageKey

        parsedRows.push({
          rowNumber,
          fullName,
          contactNumber: contactNumber ?? '',
          email,
          city: String(mapped.city ?? '').trim() || null,
          country: String(mapped.country ?? '').trim() || null,
          stage,
          source: String(mapped.source ?? '').trim() || null,
          dealValue: mapped.dealValue ? parseDealValue(mapped.dealValue) : null,
          dealCurrency: mapped.dealCurrency ? parseDealCurrency(mapped.dealCurrency) : null,
          activityNote,
          destinationCountry: String(mapped.destinationCountry ?? '').trim() || null,
          programOfInterest: String(mapped.programOfInterest ?? '').trim() || null,
          intakeMonth: String(mapped.intakeMonth ?? '').trim() || null,
          intakeYear: String(mapped.intakeYear ?? '').trim() || null,
          lastQualification: String(mapped.lastQualification ?? '').trim() || null,
          grades: String(mapped.grades ?? '').trim() || null,
          tuitionBudget: String(mapped.tuitionBudget ?? '').trim() || null,
          englishTest: String(mapped.englishTest ?? '').trim() || null,
        })
      })

      const duplicates: Array<{ row: number; name: string; matchedOn: string }> = []
      const seenEmails = new Set<string>()
      const seenPhones = new Set<string>()
      const uniqueRows = parsedRows.filter((row) => {
        // Check for duplicate phone within the file. `contactNumber` already ran
        // through normalizePhone during parsing, so "+92 300…", "0300…" and
        // "300…" rows collapse onto the same key here.
        if (row.contactNumber) {
          if (seenPhones.has(row.contactNumber)) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'phone' })
            return false
          }
          seenPhones.add(row.contactNumber)
        }
        // Check for duplicate email within the file
        if (row.email) {
          const emailKey = row.email.toLowerCase()
          if (seenEmails.has(emailKey)) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'email' })
            return false
          }
          seenEmails.add(emailKey)
        }
        return true
      })

      // Same duplicate rule the confirm phase uses below (email OR
      // format-tolerant phone, tenant-scoped, soft-deleted rows excluded) —
      // both phases go through existingLeadWhere + matchExistingLeads so the
      // preview can never disagree with what confirm actually does.
      const previewWhere = existingLeadWhere(
        ctx.tenant.id,
        uniqueRows.map((row) => row.contactNumber).filter((v): v is string => Boolean(v)),
        uniqueRows.map((row) => row.email).filter((v): v is string => Boolean(v)),
      )

      const existingLeads = previewWhere
        ? await db.select(existingLeadColumns).from(leads).where(previewWhere)
        : []

      const existingByRow = matchExistingLeads(uniqueRows, existingLeads)

      const parsedData: z.infer<typeof parsedLeadSchema>[] = []
      uniqueRows.forEach((row, index) => {
        const match = existingByRow.get(index)
        if (match) {
          duplicates.push({
            row: row.rowNumber,
            name: row.fullName,
            matchedOn: match.matchedOn === 'phone' ? 'phone (already in CRM)' : 'email (already in CRM)',
          })
          return
        }

        const { rowNumber: _rowNumber, ...rest } = row
        parsedData.push(rest)
      })

      return successResponse({
        fileName: parsed.data.fileName,
        totalRows: rawRows.length,
        validRows: parsedData.length,
        duplicateRows: duplicates.length,
        errorRows: errors.length,
        preview: parsedData.slice(0, 5),
        errors,
        duplicates,
        parsedData,
      })
    }

    if (body.action === 'confirm') {
      const parsed = confirmBodySchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
      }
      if (parsed.data.tenantSlug !== ctx.tenant.slug) {
        return errorResponse('Forbidden', 'FORBIDDEN', 403)
      }

      const totalRequested = parsed.data.agentAssignments.reduce((sum, a) => sum + a.count, 0)
      if (totalRequested !== parsed.data.parsedData.length) {
        return errorResponse('Assigned count must exactly equal the number of leads being imported', 'INVALID_DISTRIBUTION', 400)
      }

      const { defaultSubStatusId, defaultClosedAction } = await ensureDefaultSubStatus(ctx.tenant.id, defaultStageKey)

      const assignableMembers = parsed.data.agentAssignments.length > 0
        ? await db
          .select({
            userId: tenantMembers.userId,
            name: users.name,
            email: users.email,
            role: tenantMembers.role,
          })
          .from(tenantMembers)
          .innerJoin(users, eq(users.id, tenantMembers.userId))
          .where(
            and(
              eq(tenantMembers.tenantId, ctx.tenant.id),
              inArray(tenantMembers.userId, parsed.data.agentAssignments.map((a) => a.agentId)),
              isNull(tenantMembers.deletedAt),
              ...(ctx.role !== 'ADMIN' ? [eq(tenantMembers.role, 'PRO')] : []),
            ),
          )
        : []
      const validAgentIdSet = new Set(assignableMembers.map((member) => member.userId))

      const assignmentQueue: (string | null)[] = []
      for (const { agentId, count } of parsed.data.agentAssignments) {
        if (!validAgentIdSet.has(agentId)) continue
        for (let i = 0; i < count; i++) assignmentQueue.push(agentId)
      }

      const rowsToInsert: (typeof leads.$inferInsert)[] = parsed.data.parsedData.map((leadRow, index) => {
        const assignedTo = assignmentQueue[index] ?? null
        const stageKey = pipeline.stageKeys.has(leadRow.stage) ? leadRow.stage : defaultStageKey

        return {
          tenantId: ctx.tenant.id,
          fullName: leadRow.fullName,
          contactNumber: normalizePhone(leadRow.contactNumber),
          email: leadRow.email ?? null,
          city: leadRow.city ?? null,
          country: leadRow.country ?? 'Pakistan',
          primaryStage: stageKey,
          stage: stageKey as any,
          source: leadRow.source ?? 'csv_import',
          dealValue: leadRow.dealValue?.toString() ?? null,
          dealCurrency: leadRow.dealCurrency ?? 'USD',
          createdBy: ctx.dbUserId,
          assignedTo,
          updatedAt: new Date(),
          intakeMonth: leadRow.intakeMonth ? parseIntakeMonth(leadRow.intakeMonth) : null,
          intakeYear: leadRow.intakeYear ? parseIntakeYear(leadRow.intakeYear) : null,
          lastQualification: leadRow.lastQualification,
          grades: leadRow.grades,
          destinationCountry: leadRow.destinationCountry,
          programOfInterest: leadRow.programOfInterest,
          tuitionBudget: leadRow.tuitionBudget,
          englishTest: leadRow.englishTest,
          subStatusId: stageKey === defaultStageKey ? defaultSubStatusId : null,
          closedAction: stageKey === defaultStageKey ? defaultClosedAction : null,
        }
      })

      const activityNoteKey = (row: z.infer<typeof parsedLeadSchema>) =>
        `${row.fullName}|${row.contactNumber}|${row.email ?? ''}`
      const activityNotesByKey = new Map(
        parsed.data.parsedData.map((row) => [activityNoteKey(row), row.activityNote?.trim() || null]),
      )

      const [importBatch] = await db
        .insert(csvImports)
        .values({
          tenantId: ctx.tenant.id,
          importedBy: ctx.dbUserId,
          fileName: parsed.data.fileName ?? 'manual_confirm',
          campaignName: parsed.data.campaignName?.trim() || null,
          totalRows: parsed.data.totalRows ?? rowsToInsert.length,
          importedRows: 0,
          skippedRows: (parsed.data.duplicateRows ?? 0) + (parsed.data.errorRows ?? 0),
          status: 'processing',
        })
        .returning({ id: csvImports.id })

      const importBatchId = importBatch.id

      const rowsToInsertWithBatch: (typeof leads.$inferInsert)[] = rowsToInsert.map((row) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const nums = '0123456789'
        let shortId = ''
        for (let i = 0; i < 2; i++) shortId += chars.charAt(Math.floor(Math.random() * chars.length))
        for (let i = 0; i < 4; i++) shortId += nums.charAt(Math.floor(Math.random() * nums.length))
        return { ...row, csvImportId: importBatchId, displayId: shortId }
      })

      let insertedCount = 0
      let updatedCount = 0
      if (rowsToInsertWithBatch.length > 0) {
        await db.transaction(async (tx) => {
          const reimportDate = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })

          // ── Step 1: Lookup leads that already exist ────────────────────
          // Identical rule to the parse/preview phase (email OR format-
          // tolerant phone), so a row reported as new there is not silently
          // updated here, and a row flagged as a duplicate there is updated
          // here instead of being inserted twice.
          const confirmWhere = existingLeadWhere(
            ctx.tenant.id,
            rowsToInsertWithBatch
              .map((r) => r.contactNumber)
              .filter((p): p is string => Boolean(p)),
            rowsToInsertWithBatch
              .map((r) => r.email)
              .filter((e): e is string => Boolean(e)),
          )

          const existingLeads = confirmWhere
            ? await tx.select(existingLeadColumns).from(leads).where(confirmWhere)
            : []

          const existingByRow = matchExistingLeads(rowsToInsertWithBatch, existingLeads)

          // ── Step 2: Split rows into update vs insert ───────────────────
          const updateRows: typeof rowsToInsertWithBatch = []
          const updateLeadIds: string[] = []
          const newRows: typeof rowsToInsertWithBatch = []

          rowsToInsertWithBatch.forEach((row, index) => {
            const match = existingByRow.get(index)
            if (match) {
              updateRows.push(row)
              updateLeadIds.push(match.leadId)
            } else {
              newRows.push(row)
            }
          })

          updatedCount = updateRows.length

          // ── Step 3: UPDATE existing leads (preserve counselor + stage) ─
          // Only timestamps are touched: the stored contact_number keeps its
          // original formatting even when the incoming value differs only by
          // format (+92… vs 0325…), so no existing row is rewritten.
          for (let i = 0; i < updateRows.length; i++) {
            const leadId = updateLeadIds[i]
            await tx
              .update(leads)
              .set({ updatedAt: new Date(), lastContactedAt: new Date() })
              .where(eq(leads.id, leadId))
            await tx.insert(leadActivities).values({
              tenantId: ctx.tenant.id,
              leadId,
              userId: ctx.dbUserId,
              type: 'note' as const,
              note: `Re-imported via Excel on ${reimportDate}. Counselor and stage were preserved.`,
            })
          }

          // ── Step 3: INSERT genuinely new leads ─────────────────────────
          if (newRows.length > 0) {
            const inserted = await tx
              .insert(leads)
              .values(newRows)
              .onConflictDoNothing() // safety net for any remaining email conflicts
              .returning({
                id: leads.id,
                primaryStage: leads.primaryStage,
                fullName: leads.fullName,
                contactNumber: leads.contactNumber,
                email: leads.email,
              })

            insertedCount = inserted.length

            if (inserted.length > 0) {
              await tx.insert(leadStageAssignments).values(
                inserted.map((row) => ({
                  tenantId: ctx.tenant.id,
                  leadId: row.id,
                  stageKey: row.primaryStage,
                  createdBy: ctx.dbUserId,
                })),
              )

              const activityRows = inserted
                .map((row) => {
                  const note = activityNotesByKey.get(
                    `${row.fullName}|${row.contactNumber ?? ''}|${row.email ?? ''}`,
                  )
                  if (!note) return null
                  return {
                    tenantId: ctx.tenant.id,
                    leadId: row.id,
                    userId: ctx.dbUserId,
                    type: 'note' as const,
                    note: `CSV import:\n${note}`,
                  }
                })
                .filter((row): row is NonNullable<typeof row> => row !== null)

              if (activityRows.length > 0) {
                await tx.insert(leadActivities).values(activityRows)
              }
            }
          }
        })
      }


      await db
        .update(csvImports)
        .set({
          importedRows: insertedCount + updatedCount,
          status: 'done',
        })
        .where(eq(csvImports.id, importBatchId))

      const assignedCounts = new Map<string, number>()
      rowsToInsert.forEach((row) => {
        if (row.assignedTo) {
          assignedCounts.set(row.assignedTo, (assignedCounts.get(row.assignedTo) ?? 0) + 1)
        }
      })

      for (const member of assignableMembers) {
        const count = assignedCounts.get(member.userId) ?? 0
        if (count <= 0 || !member.email) continue

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          await sendLeadAssignedEmail({
            agentEmail: member.email,
            agentName: member.name ?? 'Counselor',
            leadName: `${count} leads assigned to you via CSV import`,
            contactNumber: '-',
            leadEmail: '-',
            stage: 'Imported',
            leadUrl: `${baseUrl}/t/${ctx.tenant.slug}/admin/leads`,
            workspaceName: ctx.tenant.name,
          })
        } catch (err) {
          console.error('[import-confirm] Summary email failed:', err)
        }
      }

      return successResponse({
        imported: insertedCount,
        updated: updatedCount,
        importBatchId,
        assigned: Array.from(assignedCounts.values()).reduce((acc, value) => acc + value, 0),
        skipped: (parsed.data.duplicateRows ?? 0) + (parsed.data.errorRows ?? 0),
        agentBreakdown: assignableMembers.map((member) => ({
          agentId: member.userId,
          agentName: member.name,
          leadsAssigned: assignedCounts.get(member.userId) ?? 0,
        })),
      })
    }

    return errorResponse('Unsupported action', 'VALIDATION_ERROR', 400)
  })
}
