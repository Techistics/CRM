import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import { leads, metaConnections, metaFormMappings, users } from '@/db/schema'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const campaigns = await db
      .select({
        id: metaFormMappings.id,
        formId: metaFormMappings.formId,
        campaignName: sql<string | null>`coalesce(${metaFormMappings.campaignName}, ${metaFormMappings.formName})`,
        assigneeId: metaFormMappings.assigneeId,
        assigneeName: users.name,
        leadCount: count(leads.id),
      })
      .from(metaFormMappings)
      .innerJoin(
        metaConnections,
        and(
          eq(metaFormMappings.connectionId, metaConnections.id),
          eq(metaConnections.tenantId, ctx.tenant.id),
        ),
      )
      .leftJoin(users, eq(metaFormMappings.assigneeId, users.id))
      .leftJoin(
        leads,
        and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.source, 'meta_lead'),
          isNull(leads.deletedAt),
          sql`${leads.rawData}->'meta'->>'form_id' = ${metaFormMappings.formId}`,
        ),
      )
      .groupBy(metaFormMappings.id, users.name)
      .orderBy(asc(metaFormMappings.campaignName), asc(metaFormMappings.formId))

    return successResponse({ campaigns })
  })
}
