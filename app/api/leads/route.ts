import { NextRequest, NextResponse } from 'next/server'
import { and, count, desc, ilike, or } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { leadCreateBodySchema } from '@/lib/validators/lead'
import type { StageValue } from '@/types/leads'

export async function GET(req: NextRequest) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const queryFilter = q
    ? or(
        ilike(leads.fullName, `%${q}%`),
        ilike(leads.email, `%${q}%`),
        ilike(leads.contactNumber, `%${q}%`),
      )
    : undefined

  const scope = leadsVisibleWhere(ctx.tenant.id, ctx.role, ctx.dbUserId)
  const where =
    queryFilter != null ? and(scope, queryFilter)! : scope

  const pageParam = req.nextUrl.searchParams.get('page')
  const pageSizeParam = req.nextUrl.searchParams.get('pageSize')
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
    return NextResponse.json({
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
  return NextResponse.json({ leads: rows })
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = leadCreateBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const data = parsed.data
  const nextStage = data.stage as StageValue
  const emailNorm =
    data.email === undefined || data.email === '' || data.email === null
      ? null
      : data.email

  const [created] = await db
    .insert(leads)
    .values({
      tenantId: ctx.tenant.id,
      fullName: data.fullName,
      contactNumber: data.contactNumber?.trim() || null,
      email: emailNorm,
      city: data.city?.trim() || null,
      country: data.country?.trim() || DEFAULT_LEAD_COUNTRY,
      lastQualification: data.lastQualification?.trim() || null,
      grades: data.grades?.trim() || null,
      source: data.source?.trim() || 'manual',
      assignedTo: data.assignedTo ?? null,
      createdBy: ctx.dbUserId,
      stage: nextStage,
      updatedAt: new Date(),
    })
    .returning()

  return NextResponse.json({ lead: created }, { status: 201 })
}
