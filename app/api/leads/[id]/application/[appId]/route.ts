import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { applications } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { requirePermissionApi } from '@/lib/tenant-api'
import { applicationUpsertBodySchema } from '@/lib/validators/application'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

// ─── PUT /api/leads/[id]/application/[appId] ─────────────────
// Updates a specific application by its ID.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.edit')
    if (!ctx.ok) return ctx.response

    const { id, appId } = await params

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

    const [updated] = await db
      .update(applications)
      .set({
        universityName,
        courseName,
        source,
        partnerPortalName: source === 'partner_portal' ? (partnerPortalName ?? null) : null,
        applicationStatus,
        intakeMonth: applicationStatus === 'intake' ? (intakeMonth ?? null) : null,
        intakeYear: applicationStatus === 'intake' ? (intakeYear ?? null) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applications.id, appId),
          eq(applications.leadId, id),
          eq(applications.tenantId, ctx.tenant.id),
        ),
      )
      .returning()

    if (!updated) {
      return errorResponse('Application not found', 'NOT_FOUND', 404)
    }

    return successResponse({ application: updated })
  })
}

// ─── DELETE /api/leads/[id]/application/[appId] ──────────────
// Deletes a specific application by its ID.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.edit')
    if (!ctx.ok) return ctx.response

    const { id, appId } = await params

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const [deleted] = await db
      .delete(applications)
      .where(
        and(
          eq(applications.id, appId),
          eq(applications.leadId, id),
          eq(applications.tenantId, ctx.tenant.id),
        ),
      )
      .returning({ id: applications.id })

    if (!deleted) {
      return errorResponse('Application not found', 'NOT_FOUND', 404)
    }

    return successResponse({ deleted: true })
  })
}
