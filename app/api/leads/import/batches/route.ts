import { NextRequest } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  consultantLogs,
  csvImports,
  leadActivities,
  leadDocumentChecklist,
  leadReminders,
  leadStageAssignments,
  leadTagAssignments,
  leadUploadedDocuments,
  leadWhatsappLogs,
  leads,
  notifications,
  users,
} from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { hasTenantWideLeadAccess, toMemberScope } from '@/lib/member-scope'
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('import.leads')
    if (!ctx.ok) return ctx.response

    const batches = await db
      .select({
        id: csvImports.id,
        fileName: csvImports.fileName,
        campaignName: csvImports.campaignName,
        totalRows: csvImports.totalRows,
        importedRows: csvImports.importedRows,
        skippedRows: csvImports.skippedRows,
        status: csvImports.status,
        createdAt: csvImports.createdAt,
        importedByName: users.name,
      })
      .from(csvImports)
      .leftJoin(users, eq(users.id, csvImports.importedBy))
      .where(eq(csvImports.tenantId, ctx.tenant.id))
      .orderBy(desc(csvImports.createdAt))
      .limit(50)

    return successResponse({ batches })
  })
}

export async function DELETE(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.delete')
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    const batchIds = body?.batchIds
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return errorResponse('batchIds required', 'VALIDATION_ERROR', 400)
    }

    const validIds = batchIds.filter((id: unknown): id is string => typeof id === 'string')
    if (validIds.length === 0) {
      return errorResponse('No valid batch ids', 'VALIDATION_ERROR', 400)
    }

    const result = await db.transaction(async (tx) => {
      const ownedBatches = await tx
        .select({ id: csvImports.id })
        .from(csvImports)
        .where(and(eq(csvImports.tenantId, ctx.tenant.id), inArray(csvImports.id, validIds)))
      const ownedIds = ownedBatches.map((b) => b.id)
      if (ownedIds.length === 0) {
        return { forbidden: false, deletedLeads: 0, deletedBatches: 0 }
      }

      const scope = toMemberScope({ ...ctx, permissions: ctx.permissions ?? [] })
      const leadRows = await tx
        .select({ id: leads.id, assignedTo: leads.assignedTo })
        .from(leads)
        .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.csvImportId, ownedIds)))

      if (
        !hasTenantWideLeadAccess(scope) &&
        leadRows.some((lead) => lead.assignedTo !== scope.dbUserId)
      ) {
        return { forbidden: true, deletedLeads: 0, deletedBatches: 0 }
      }

      const leadIds = leadRows.map((r) => r.id)

      if (leadIds.length > 0) {
        // Clean up all child tables (tenant-scoped where column exists)
        await tx.delete(leadActivities).where(
          and(eq(leadActivities.tenantId, ctx.tenant.id), inArray(leadActivities.leadId, leadIds)),
        )
        await tx.delete(leadDocumentChecklist).where(
          and(
            eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
            inArray(leadDocumentChecklist.leadId, leadIds),
          ),
        )
        await tx.delete(leadUploadedDocuments).where(
          and(
            eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
            inArray(leadUploadedDocuments.leadId, leadIds),
          ),
        )
        await tx.delete(leadReminders).where(
          and(eq(leadReminders.tenantId, ctx.tenant.id), inArray(leadReminders.leadId, leadIds)),
        )
        await tx.delete(leadWhatsappLogs).where(
          and(eq(leadWhatsappLogs.tenantId, ctx.tenant.id), inArray(leadWhatsappLogs.leadId, leadIds)),
        )
        await tx.delete(consultantLogs).where(
          and(eq(consultantLogs.tenantId, ctx.tenant.id), inArray(consultantLogs.leadId, leadIds)),
        )
        await tx.delete(notifications).where(
          and(eq(notifications.tenantId, ctx.tenant.id), inArray(notifications.leadId, leadIds)),
        )
        await tx.delete(leadTagAssignments).where(inArray(leadTagAssignments.leadId, leadIds))
        await tx.delete(leadStageAssignments).where(
          and(
            eq(leadStageAssignments.tenantId, ctx.tenant.id),
            inArray(leadStageAssignments.leadId, leadIds),
          ),
        )
        // Delete the leads themselves
        await tx.delete(leads).where(
          and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, leadIds)),
        )
      }

      // Delete the batch records inside the same transaction
      await tx.delete(csvImports).where(
        and(eq(csvImports.tenantId, ctx.tenant.id), inArray(csvImports.id, ownedIds)),
      )

      return { forbidden: false, deletedLeads: leadIds.length, deletedBatches: ownedIds.length }
    })

    if (result.forbidden) {
      return errorResponse('Batch contains leads outside your access scope', 'FORBIDDEN', 403)
    }

    return successResponse({
      deletedLeads: result.deletedLeads,
      deletedBatches: result.deletedBatches,
    })
  })
}
