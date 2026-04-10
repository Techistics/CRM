import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ilike, or } from 'drizzle-orm'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
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

  const where =
    queryFilter && ctx.role === 'agent'
      ? and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.assignedTo, ctx.dbUserId),
          queryFilter,
        )
      : queryFilter
        ? and(eq(leads.tenantId, ctx.tenant.id), queryFilter)
        : ctx.role === 'agent'
          ? and(eq(leads.tenantId, ctx.tenant.id), eq(leads.assignedTo, ctx.dbUserId))
          : eq(leads.tenantId, ctx.tenant.id)

  const rows = await db.select().from(leads).where(where)
  return NextResponse.json({ leads: rows })
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json()
  const fullName = String(body?.fullName ?? '').trim()
  const nextStage = (body?.stage ? String(body.stage) : 'new_lead') as StageValue
  if (!fullName) {
    return NextResponse.json({ error: 'fullName is required' }, { status: 400 })
  }

  const [created] = await db
    .insert(leads)
    .values({
      tenantId: ctx.tenant.id,
      fullName,
      contactNumber: body?.contactNumber ? String(body.contactNumber).trim() : null,
      email: body?.email ? String(body.email).trim().toLowerCase() : null,
      city: body?.city ? String(body.city).trim() : null,
      country: body?.country ? String(body.country).trim() : 'India',
      lastQualification: body?.lastQualification
        ? String(body.lastQualification).trim()
        : null,
      grades: body?.grades ? String(body.grades).trim() : null,
      source: body?.source ? String(body.source).trim() : 'manual',
      assignedTo: body?.assignedTo ? String(body.assignedTo) : null,
      createdBy: ctx.dbUserId,
      stage: nextStage,
      updatedAt: new Date(),
    })
    .returning()

  return NextResponse.json({ lead: created }, { status: 201 })
}
