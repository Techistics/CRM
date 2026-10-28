import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import { leads, metaCampaigns, metaConnections, users } from '@/db/schema'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const campaigns = await db
      .select({
        id: metaCampaigns.id,
        campaignId: metaCampaigns.campaignId,
        campaignName: metaCampaigns.campaignName,
        status: metaCampaigns.status,
        assigneeId: metaCampaigns.assigneeId,
        assigneeName: users.name,
        leadCount: count(leads.id),
      })
      .from(metaCampaigns)
      .innerJoin(
        metaConnections,
        and(
          eq(metaCampaigns.connectionId, metaConnections.id),
          eq(metaConnections.tenantId, ctx.tenant.id),
          sql`upper(${metaCampaigns.status}) = 'ACTIVE'`,
        ),
      )
      .leftJoin(users, eq(metaCampaigns.assigneeId, users.id))
      .leftJoin(
        leads,
        and(
          eq(leads.tenantId, ctx.tenant.id),
          eq(leads.source, 'meta_lead'),
          isNull(leads.deletedAt),
          sql`${leads.rawData}->>'campaign_id' = ${metaCampaigns.campaignId}`,
        ),
      )
      .groupBy(metaCampaigns.id, users.name)
      .orderBy(asc(metaCampaigns.campaignName), asc(metaCampaigns.campaignId))

    return successResponse({ campaigns })
  })
}
