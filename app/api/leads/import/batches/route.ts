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
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('import.leads')
    if (!ctx.ok) return ctx.response

    const batches = await db
      .select({
        id: csvImports.id,
        fileName: csvImports.fileName,
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

    // Verify batches belong to this tenant
    const ownedBatches = await db
      .select({ id: csvImports.id })
      .from(csvImports)
      .where(and(eq(csvImports.tenantId, ctx.tenant.id), inArray(csvImports.id, validIds)))

    const ownedIds = ownedBatches.map((b) => b.id)
    if (ownedIds.length === 0) {
      return successResponse({ deletedLeads: 0, deletedBatches: 0 })
    }

    // Find all leads linked to these batches (scoped to tenant)
    const leadRows = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.csvImportId, ownedIds)))

    const leadIds = leadRows.map((r) => r.id)

    // Atomically delete leads, all related data, AND the batch records in one transaction.
    // Previously csvImports deletion was outside the transaction — if the lead-deletion
    // transaction failed, csvImports would still be deleted, triggering the FK
    // onDelete:'set null' which nullified leads.csvImportId. This left leads orphaned
    // (invisible in batch history but still in the DB).
    await db.transaction(async (tx) => {
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
    })

    return successResponse({
      deletedLeads: leadIds.length,
      deletedBatches: ownedIds.length,
    })
  })
}
