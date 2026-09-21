import { NextRequest } from 'next/server'
import { and, eq, asc } from 'drizzle-orm'

import { db } from '@/db'
import { applications } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { requirePermissionApi } from '@/lib/tenant-api'
import { applicationUpsertBodySchema } from '@/lib/validators/application'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

// ─── GET /api/leads/[id]/application ─────────────────────────
// Returns ALL applications for a lead (array).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.view')
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const rows = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.leadId, id),
          eq(applications.tenantId, ctx.tenant.id),
        ),
      )
      .orderBy(asc(applications.createdAt))

    return successResponse({ applications: rows })
  })
}

// ─── POST /api/leads/[id]/application ────────────────────────
// Creates a NEW application for a lead (multiple allowed).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.edit')
    if (!ctx.ok) return ctx.response

    const { id } = await params

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = applicationUpsertBodySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Validation failed'
      return errorResponse(firstError, 'VALIDATION_ERROR', 400)
    }

    const {
      universityName,
      courseName,
      source,
      partnerPortalName,
      applicationStatus,
      intakeMonth,
      intakeYear,
    } = parsed.data

    const now = new Date()

    const [application] = await db
      .insert(applications)
      .values({
        leadId: id,
        tenantId: ctx.tenant.id,
        universityName,
        courseName,
        source,
        partnerPortalName: source === 'partner_portal' ? (partnerPortalName ?? null) : null,
        applicationStatus,
        intakeMonth: applicationStatus === 'intake' ? (intakeMonth ?? null) : null,
        intakeYear: applicationStatus === 'intake' ? (intakeYear ?? null) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return successResponse({ application }, 201)
  })
}
