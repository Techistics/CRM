import { NextRequest } from 'next/server'
import { and, count, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  leadActivities,
  leadDocumentChecklist,
  leadReminders,
  leadUploadedDocuments,
} from '@/db/schema'
import { getLeadInTenant } from '@/lib/lead-tenant'
import { requirePermissionApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.delete')
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const lead = await getLeadInTenant(id, ctx.tenant.id)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const [activities, reminders, documents, checklist] = await Promise.all([
      db
        .select({ c: count() })
        .from(leadActivities)
        .where(
          and(
            eq(leadActivities.leadId, id),
            eq(leadActivities.tenantId, ctx.tenant.id),
          ),
        ),
      db
        .select({ c: count() })
        .from(leadReminders)
        .where(
          and(
            eq(leadReminders.leadId, id),
            eq(leadReminders.tenantId, ctx.tenant.id),
          ),
        ),
      db
        .select({ c: count() })
        .from(leadUploadedDocuments)
        .where(
          and(
            eq(leadUploadedDocuments.leadId, id),
            eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
          ),
        ),
      db
        .select({ c: count() })
        .from(leadDocumentChecklist)
        .where(
          and(
            eq(leadDocumentChecklist.leadId, id),
            eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
          ),
        ),
    ])

    const counts = {
      activities: Number(activities[0]?.c ?? 0),
      reminders: Number(reminders[0]?.c ?? 0),
      documents: Number(documents[0]?.c ?? 0),
      checklistItems: Number(checklist[0]?.c ?? 0),
    }

    const total =
      counts.activities +
      counts.reminders +
      counts.documents +
      counts.checklistItems

    return successResponse({
      leadName: lead.fullName,
      counts: {
        ...counts,
        total,
      },
    })
  })
}
