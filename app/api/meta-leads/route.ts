import { NextRequest } from 'next/server'
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requirePermissionApi } from '@/lib/tenant-api'

function parseDate(value: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  if (endOfDay) date.setUTCHours(23, 59, 59, 999)
  return date
}

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.assign')
    if (!ctx.ok) return ctx.response

    const params = new URL(req.url).searchParams
    const assigned = params.get('assigned') ?? 'all'
    if (assigned !== 'all' && assigned !== 'unassigned' && assigned !== 'assigned') {
      return errorResponse('Invalid assigned filter', 'INVALID_FILTER', 400)
    }

    const pageValue = Number(params.get('page') ?? 1)
    const pageSizeValue = Number(params.get('pageSize') ?? 50)
    const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1
    const pageSize = Number.isFinite(pageSizeValue)
      ? Math.min(100, Math.max(1, Math.floor(pageSizeValue)))
      : 50
    const offset = (page - 1) * pageSize

    const fromParam = params.get('from')
    const toParam = params.get('to')
    const from = fromParam ? parseDate(fromParam) : null
    const to = toParam ? parseDate(toParam, true) : null
    if ((fromParam && !from) || (toParam && !to)) {
      return errorResponse('Dates must be valid YYYY-MM-DD values', 'INVALID_DATE', 400)
    }
    if (from && to && from > to) {
      return errorResponse('from must be on or before to', 'INVALID_DATE_RANGE', 400)
    }

    const baseConditions = [
      eq(leads.tenantId, ctx.tenant.id),
      eq(leads.source, 'meta_lead'),
      isNull(leads.deletedAt),
    ]
    const conditions = [...baseConditions]

    if (assigned === 'unassigned') conditions.push(isNull(leads.assignedTo))
    if (assigned === 'assigned') conditions.push(isNotNull(leads.assignedTo))

    const campaign = params.get('campaign')
    if (campaign !== null) {
      conditions.push(sql`${leads.rawData}->>'campaign_name' = ${campaign}`)
    }

    const q = (params.get('q') ?? '').trim()
    if (q) {
      conditions.push(
        or(
          ilike(leads.fullName, `%${q}%`),
          ilike(leads.contactNumber, `%${q}%`),
          ilike(leads.email, `%${q}%`),
        )!,
      )
    }

    if (from) conditions.push(gte(leads.createdAt, from))
    if (to) conditions.push(lte(leads.createdAt, to))

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [leadRows, totalRows, statsRows, campaignRows] = await Promise.all([
      db
        .select({
          id: leads.id,
          displayId: leads.displayId,
          fullName: leads.fullName,
          contactNumber: leads.contactNumber,
          email: leads.email,
          destinationCountry: leads.destinationCountry,
          campaign: sql<string | null>`${leads.rawData}->>'campaign_name'`,
          createdAt: leads.createdAt,
          assignedTo: leads.assignedTo,
          assignedToName: users.name,
          reassignedFrom: leads.reassignedFrom,
          primaryStage: leads.primaryStage,
        })
        .from(leads)
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(leads)
        .where(and(...conditions)),
      db
        .select({
          today: sql<number>`count(*) filter (where ${leads.createdAt} >= ${todayStart})::int`,
          unassigned: sql<number>`count(*) filter (where ${leads.assignedTo} is null)::int`,
          assigned: sql<number>`count(*) filter (where ${leads.assignedTo} is not null)::int`,
        })
        .from(leads)
        .where(and(...baseConditions)),
      db
        .selectDistinct({
          campaign: sql<string>`${leads.rawData}->>'campaign_name'`,
        })
        .from(leads)
        .where(
          and(
            ...baseConditions,
            isNotNull(sql`${leads.rawData}->>'campaign_name'`),
            sql`${leads.rawData}->>'campaign_name' <> ''`,
          ),
        )
        .orderBy(asc(sql`${leads.rawData}->>'campaign_name'`)),
    ])

    return successResponse({
      leads: leadRows,
      total: totalRows[0]?.total ?? 0,
      stats: {
        today: statsRows[0]?.today ?? 0,
        unassigned: statsRows[0]?.unassigned ?? 0,
        assigned: statsRows[0]?.assigned ?? 0,
      },
      campaigns: campaignRows.map((row) => row.campaign),
    })
  })
}
