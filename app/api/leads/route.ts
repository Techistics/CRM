import { NextRequest } from 'next/server'
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { db } from '@/db'
import { leads, leadTagAssignments } from '@/db/schema'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { leadCreateBodySchema } from '@/lib/validators/lead'
import type { StageValue } from '@/types/leads'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()
    const tagsParam = url.searchParams.get('tags')

    const conditions = [leadsVisibleWhere(ctx.tenant.id, ctx.role, ctx.dbUserId)]

    if (q) {
      conditions.push(
        or(
          ilike(leads.fullName, `%${q}%`),
          ilike(leads.email, `%${q}%`),
          ilike(leads.contactNumber, `%${q}%`),
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

    const where = and(...conditions)

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
        .select()
        .from(leads)
        .where(where)
        .orderBy(desc(leads.updatedAt))
        .limit(pageSize)
        .offset(offset)
      
      return successResponse({
        leads: rows,
        total: Number(totalRow?.c ?? 0),
        page,
        pageSize,
      })
    }

    const rows = await db
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.updatedAt))
    
    return successResponse({ leads: rows })
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
    const nextStage = data.stage as StageValue
    const emailNorm =
      data.email === undefined || data.email === '' || data.email === null
        ? null
        : data.email

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

    const [created] = await db
      .insert(leads)
      .values({
        tenantId: ctx.tenant.id,
        fullName: data.fullName,
        contactNumber: data.contactNumber?.trim() || null,
        email: emailNorm,
        city: data.city?.trim() || null,
        country: data.country?.trim() || DEFAULT_LEAD_COUNTRY,
        lastQualification: (data as any).notes || data.lastQualification?.trim() || null,
        grades: data.grades?.trim() || null,
        source: data.source?.trim() || 'manual',
        assignedTo: data.assignedTo ?? null,
        dealValue: data.dealValue?.toString() ?? null,
        dealCurrency: data.dealCurrency,
        createdBy: ctx.dbUserId,
        stage: nextStage,
        updatedAt: new Date(),
      })
      .returning()

    return successResponse({ lead: created }, 201)
  })
}
