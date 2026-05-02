import { NextRequest } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { and, eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { csvImports, leads, tenantMembers, users, leadStageAssignments } from '@/db/schema'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { sendLeadAssignedEmail } from '@/lib/mail'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getTenantPipeline } from '@/lib/pipeline/config'

const parseBodySchema = z.object({
  action: z.literal('parse'),
  fileData: z.string().min(1),
  fileName: z.string().min(1),
  tenantSlug: z.string().min(1),
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
  notes: z.string().optional().nullable(),
})

const confirmBodySchema = z.object({
  action: z.literal('confirm'),
  parsedData: z.array(parsedLeadSchema),
  assignToAgentIds: z.array(z.string().uuid()),
  tenantSlug: z.string().min(1),
  fileName: z.string().optional(),
  totalRows: z.number().optional(),
  duplicateRows: z.number().optional(),
  errorRows: z.number().optional(),
})

const COLUMN_MAP: Record<string, keyof z.infer<typeof parsedLeadSchema>> = {
  'full name': 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  contact: 'contactNumber',
  phone: 'contactNumber',
  contactnumber: 'contactNumber',
  contact_number: 'contactNumber',
  email: 'email',
  city: 'city',
  country: 'country',
  stage: 'stage',
  source: 'source',
  'deal value': 'dealValue',
  dealvalue: 'dealValue',
  deal_value: 'dealValue',
  notes: 'notes',
}

function normalizeStageValue(value: unknown): string {
  const stageRaw = String(value ?? '').trim().toLowerCase()
  const compact = stageRaw.replace(/[\s_-]+/g, ' ').trim()

  if (compact === 'new' || compact === 'new lead' || compact === 'new_lead') return 'new_lead'
  if (compact === 'contacted' || compact === 'contact') return 'contacted'
  if (compact === 'follow up' || compact === 'follow_up' || compact === 'followup') return 'follow_up'
  if (compact === 'walk in' || compact === 'walkin' || compact === 'walkin booked' || compact === 'walk-in' || compact === 'walkin_booked') return 'walkin_booked'
  if (compact === 'docs' || compact === 'documents' || compact === 'docs received' || compact === 'docs_received') return 'docs_received'
  if (compact === 'options' || compact === 'options sent' || compact === 'options_sent') return 'options_sent'
  if (compact === 'paid' || compact === 'won' || compact === 'closed') return 'paid'
  if (compact === 'lost' || compact === 'cancelled' || compact === 'canceled') return 'cancelled'

  return 'new_lead'
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

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
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

    if (body.action === 'parse') {
      const parsed = parseBodySchema.safeParse(body)
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

      const errors: Array<{ row: number; field: string; message: string }> = []
      const parsedRows: Array<z.infer<typeof parsedLeadSchema> & { rowNumber: number }> = []

      rawRows.forEach((row, idx) => {
        const rowNumber = idx + 2
        const mapped: Record<string, unknown> = {}
        Object.entries(row).forEach(([key, value]) => {
          const normalized = key.toLowerCase().trim().replace(/\s+/g, ' ')
          const target = COLUMN_MAP[normalized]
          if (target) mapped[target] = typeof value === 'string' ? value.trim() : value
        })

        const fullName = String(mapped.fullName ?? '').trim()
        if (fullName.length < 2) {
          errors.push({ row: rowNumber, field: 'fullName', message: 'Name is required' })
          return
        }

        const contactNumberRaw = String(mapped.contactNumber ?? '').trim()
        const contactNumber = contactNumberRaw.length > 0 ? contactNumberRaw : null

        const emailRaw = String(mapped.email ?? '').trim()
        const email =
          emailRaw.length > 0 && z.string().email().safeParse(emailRaw).success
            ? emailRaw.toLowerCase()
            : null

        const stageNormalized = normalizeStageValue(mapped.stage)
        const stage = pipeline.stageKeys.has(stageNormalized) ? stageNormalized : defaultStageKey

        const dealValueRaw = String(mapped.dealValue ?? '').trim()
        const dealValueCandidate = dealValueRaw.length > 0 ? Number(dealValueRaw) : null
        const dealValue =
          dealValueCandidate != null && !Number.isNaN(dealValueCandidate)
            ? dealValueCandidate
            : null

        parsedRows.push({
          rowNumber,
          fullName,
          contactNumber: contactNumber ?? '',
          email,
          city: String(mapped.city ?? '').trim() || null,
          country: String(mapped.country ?? '').trim() || null,
          stage,
          source: String(mapped.source ?? '').trim() || null,
          dealValue,
          notes: String(mapped.notes ?? '').trim() || null,
        })
      })

      const duplicates: Array<{ row: number; name: string; matchedOn: string }> = []
      const seenEmails = new Set<string>()
      const seenPhones = new Set<string>()
      const uniqueRows = parsedRows.filter((row) => {
        if (row.email) {
          const emailKey = row.email.toLowerCase()
          if (seenEmails.has(emailKey)) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'email' })
            return false
          }
          seenEmails.add(emailKey)
        }

        const phoneKey = row.contactNumber.trim()
        if (phoneKey) {
          if (seenPhones.has(phoneKey)) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'phone' })
            return false
          }
          seenPhones.add(phoneKey)
        }
        return true
      })

      const emails = uniqueRows.map((row) => row.email).filter((v): v is string => Boolean(v))
      const phones = uniqueRows
        .map((row) => row.contactNumber.trim())
        .filter((v) => v.length > 0)

      const existing = emails.length > 0 || phones.length > 0
        ? await db
            .select({
              email: leads.email,
              contactNumber: leads.contactNumber,
            })
            .from(leads)
            .where(
              and(
                eq(leads.tenantId, ctx.tenant.id),
                or(
                  emails.length > 0 ? inArray(leads.email, emails) : undefined,
                  phones.length > 0 ? inArray(leads.contactNumber, phones) : undefined,
                ),
              ),
            )
        : []

      const existingEmailSet = new Set(existing.map((item) => item.email).filter((v): v is string => Boolean(v)))
      const existingPhoneSet = new Set(existing.map((item) => item.contactNumber).filter((v): v is string => Boolean(v)))

      const parsedData = uniqueRows
        .filter((row) => {
          if (row.email && existingEmailSet.has(row.email.toLowerCase())) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'email' })
            return false
          }
          if (row.contactNumber && existingPhoneSet.has(row.contactNumber)) {
            duplicates.push({ row: row.rowNumber, name: row.fullName, matchedOn: 'phone' })
            return false
          }
          return true
        })
        .map((row) => {
          const { rowNumber: _, ...rest } = row
          return rest
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

      const assignableMembers = parsed.data.assignToAgentIds.length > 0
        ? await db
            .select({ userId: tenantMembers.userId, name: users.name, email: users.email })
            .from(tenantMembers)
            .innerJoin(users, eq(users.id, tenantMembers.userId))
            .where(
              and(
                eq(tenantMembers.tenantId, ctx.tenant.id),
                inArray(tenantMembers.userId, parsed.data.assignToAgentIds),
              ),
            )
        : []
      const validAgentIds = assignableMembers.map((member) => member.userId)

      const rowsToInsert: (typeof leads.$inferInsert)[] = parsed.data.parsedData.map((leadRow, index) => {
        // Round-robin distribution
        const assignedTo =
          validAgentIds.length > 0 ? validAgentIds[index % validAgentIds.length] : null

        const stageKey = pipeline.stageKeys.has(leadRow.stage) ? leadRow.stage : defaultStageKey

        return {
          tenantId: ctx.tenant.id,
          fullName: leadRow.fullName,
          contactNumber: leadRow.contactNumber,
          email: leadRow.email ?? null,
          city: leadRow.city ?? null,
          country: leadRow.country ?? 'Pakistan',
          primaryStage: stageKey,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stage: stageKey as any,
          source: leadRow.source ?? 'csv_import',
          lastQualification: leadRow.notes ?? null,
          dealValue: leadRow.dealValue != null ? leadRow.dealValue.toString() : null,
          createdBy: ctx.dbUserId,
          assignedTo,
          updatedAt: new Date(),
        }
      })

      if (rowsToInsert.length > 0) {
        await db.transaction(async (tx) => {
          const inserted = await tx.insert(leads).values(rowsToInsert).onConflictDoNothing().returning({
            id: leads.id,
            primaryStage: leads.primaryStage,
          })

          if (inserted.length > 0) {
            await tx.insert(leadStageAssignments).values(
              inserted.map((row) => ({
                tenantId: ctx.tenant.id,
                leadId: row.id,
                stageKey: row.primaryStage,
                createdBy: ctx.dbUserId,
              })),
            )
          }
        })
      }

      const assignedCounts = new Map<string, number>()
      rowsToInsert.forEach((row) => {
        if (row.assignedTo) {
          assignedCounts.set(row.assignedTo, (assignedCounts.get(row.assignedTo) ?? 0) + 1)
        }
      })

      await db.insert(csvImports).values({
        tenantId: ctx.tenant.id,
        importedBy: ctx.dbUserId,
        fileName: parsed.data.fileName ?? 'manual_confirm',
        totalRows: parsed.data.totalRows ?? rowsToInsert.length,
        importedRows: rowsToInsert.length,
        skippedRows: (parsed.data.duplicateRows ?? 0) + (parsed.data.errorRows ?? 0),
        status: 'done',
      })

      // Send ONE email per agent summarizing their new leads
      for (const member of assignableMembers) {
        const count = assignedCounts.get(member.userId) ?? 0
        if (count <= 0 || !member.email) continue
        
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
          await sendLeadAssignedEmail({
            agentEmail: member.email,
            agentName: member.name ?? 'Agent',
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
        imported: rowsToInsert.length,
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

