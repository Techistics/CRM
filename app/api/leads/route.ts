import { NextRequest } from 'next/server'
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { db } from '@/db'
import { leads, leadTagAssignments, leadTags, leadStageAssignments } from '@/db/schema'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { leadCreateBodySchema } from '@/lib/validators/lead'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { getTenantPipeline } from '@/lib/pipeline/config'
import { rateLimit } from '@/lib/rate-limit'
import { stripDealFieldsFromList } from '@/lib/leads/deal-access'

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    // Rate limit: Max 50 requests per 10 seconds per workspace to prevent noisy neighbors
    const rl = rateLimit(`leads-get-${ctx.tenant.id}`, 50, 10000)
    if (!rl.success) {
      return errorResponse('Rate limit exceeded. Please slow down.', 'RATE_LIMIT', 429)
    }

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim()
    const tagsParam = url.searchParams.get('tags')
    const assignedTo = url.searchParams.get('assignedTo')?.trim()
    const stage = url.searchParams.get('stage')?.trim()
    const idsOnly = url.searchParams.get('idsOnly') === 'true'

    const conditions = [leadsVisibleWhere(ctx.tenant.id, ctx.role, ctx.dbUserId)]

    if (q) {
      conditions.push(
        or(
          ilike(leads.fullName, `%${q}%`),
          ilike(leads.email, `%${q}%`),
          ilike(leads.contactNumber, `%${q}%`),
          sql`${leads.id}::text ILIKE ${`%${q}%`}`,
        )!
      )
    }

    if (tagsParam) {
      const tagIds = tagsParam.split(',').filter(Boolean)
      if (tagIds.length > 0) {
        // Strict AND logic: lead must have ALL selected tags
        const subquery = db
          .select({ leadId: leadTagAssignments.leadId })
          .from(leadTagAssignments)
          .where(inArray(leadTagAssignments.tagId, tagIds))
          .groupBy(leadTagAssignments.leadId)
          .having(sql`count(distinct ${leadTagAssignments.tagId}) = ${tagIds.length}`)

        conditions.push(inArray(leads.id, subquery))
      }
    }

    if (assignedTo) {
      conditions.push(eq(leads.assignedTo, assignedTo))
    }

    if (stage) {
      conditions.push(eq(leads.primaryStage, stage))
    }

    const where = and(...conditions)

    const attachTagsToLeads = async <
      T extends {
        id: string
      },
    >(
      rows: T[],
    ): Promise<Array<T & { tags: Array<{ id: string; name: string; color: string }> }>> => {
      if (rows.length === 0) {
        return rows.map((row) => ({ ...row, tags: [] }))
      }

      const leadIds = rows.map((row) => row.id)
      const tagRows = await db
        .select({
          leadId: leadTagAssignments.leadId,
          id: leadTags.id,
          name: leadTags.name,
          color: leadTags.color,
        })
        .from(leadTagAssignments)
        .innerJoin(leadTags, eq(leadTags.id, leadTagAssignments.tagId))
        .where(inArray(leadTagAssignments.leadId, leadIds))

      const tagsByLeadId = new Map<string, Array<{ id: string; name: string; color: string }>>()
      for (const tagRow of tagRows) {
        const current = tagsByLeadId.get(tagRow.leadId) ?? []
        current.push({ id: tagRow.id, name: tagRow.name, color: tagRow.color })
        tagsByLeadId.set(tagRow.leadId, current)
      }

      return rows.map((row) => ({
        ...row,
        tags: tagsByLeadId.get(row.id) ?? [],
      }))
    }

    if (idsOnly) {
      const rows = await db
        .select({ id: leads.id })
        .from(leads)
        .where(where)
        .orderBy(desc(leads.updatedAt))
      return successResponse({ leadIds: rows.map((row) => row.id) })
    }

    const pageParam = url.searchParams.get('page')
    const pageSizeParam = url.searchParams.get('pageSize')
    const paginate = pageParam != null || pageSizeParam != null
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 50))
    const page = Math.max(1, Number(pageParam) || 1)
    const offset = (page - 1) * pageSize

    if (paginate) {
      const [totalRow] = await db
        .select({ c: count() })
        .from(leads)
        .where(where)
      const rows = await db
        .select({
          id: leads.id,
          tenantId: leads.tenantId,
          fullName: leads.fullName,
          contactNumber: leads.contactNumber,
          email: leads.email,
          city: leads.city,
          country: leads.country,
          lastQualification: leads.lastQualification,
          grades: leads.grades,
          source: leads.source,
          rawData: leads.rawData,
          stage: leads.primaryStage,
          lastContactedAt: leads.lastContactedAt,
          assignedTo: leads.assignedTo,
          createdBy: leads.createdBy,
          dealValue: leads.dealValue,
          dealCurrency: leads.dealCurrency,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .where(where)
        .orderBy(desc(leads.updatedAt))
        .limit(pageSize)
        .offset(offset)
      const rowsWithTags = stripDealFieldsFromList(
        await attachTagsToLeads(rows),
        ctx.role,
      )

      return successResponse({
        leads: rowsWithTags,
        total: Number(totalRow?.c ?? 0),
        page,
        pageSize,
      })
    }

    const rows = await db
      .select({
        id: leads.id,
        tenantId: leads.tenantId,
        fullName: leads.fullName,
        contactNumber: leads.contactNumber,
        email: leads.email,
        city: leads.city,
        country: leads.country,
        lastQualification: leads.lastQualification,
        grades: leads.grades,
        source: leads.source,
        rawData: leads.rawData,
          stage: leads.primaryStage,
        lastContactedAt: leads.lastContactedAt,
        assignedTo: leads.assignedTo,
        createdBy: leads.createdBy,
        dealValue: leads.dealValue,
        dealCurrency: leads.dealCurrency,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(where)
      .orderBy(desc(leads.updatedAt))
    const rowsWithTags = stripDealFieldsFromList(
      await attachTagsToLeads(rows),
      ctx.role,
    )

    return successResponse({ leads: rowsWithTags })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = leadCreateBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        'Validation failed', 
        'VALIDATION_ERROR', 
        400
      )
    }

    const data = parsed.data
    const nextStage = data.stage as string
    const emailNorm =
      data.email === undefined || data.email === '' || data.email === null
        ? null
        : data.email

    const pipeline = await getTenantPipeline(ctx.tenant.id)
    if (pipeline.stages.length === 0) {
      return errorResponse('Pipeline not configured', 'PIPELINE_NOT_CONFIGURED', 409)
    }
    if (!pipeline.stageKeys.has(nextStage)) {
      return errorResponse('Invalid stage', 'INVALID_STAGE', 400)
    }

    // 1. Duplicate check (if not forced)
    if (!data.force) {
      const existing = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.tenantId, ctx.tenant.id),
            or(
              emailNorm ? eq(leads.email, emailNorm) : undefined,
              data.contactNumber ? eq(leads.contactNumber, data.contactNumber) : undefined
            )
          )
        )
        .limit(1)

      if (existing.length > 0) {
        return errorResponse(
          'A lead with this contact number or email already exists',
          'DUPLICATE_LEAD',
          409
        )
      }
    }

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(leads)
        .values({
          tenantId: ctx.tenant.id,
          fullName: data.fullName,
          contactNumber: data.contactNumber?.trim() || null,
          email: emailNorm,
          city: data.city?.trim() || null,
          country: data.country?.trim() || DEFAULT_LEAD_COUNTRY,
          lastQualification: data.notes || data.lastQualification?.trim() || null,
          grades: data.grades?.trim() || null,
          source: data.source?.trim() || 'manual',
          assignedTo: data.assignedTo ?? null,
          dealValue: data.dealValue?.toString() ?? null,
          dealCurrency: data.dealCurrency,
          // NEW – intake & destination fields
          intakeMonth: data.intakeMonth?.trim() || null,
          destinationCountry: data.destinationCountry?.trim() || null,
          programOfInterest: data.programOfInterest?.trim() || null,
          createdBy: ctx.dbUserId,
          primaryStage: nextStage,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stage: nextStage as any,
          updatedAt: new Date(),
        })
        .returning()

      await tx.insert(leadStageAssignments).values({
        tenantId: ctx.tenant.id,
        leadId: row.id,
        stageKey: nextStage,
        createdBy: ctx.dbUserId,
      })

      return row
    })

    return successResponse({ lead: created }, 201)
  })
}
