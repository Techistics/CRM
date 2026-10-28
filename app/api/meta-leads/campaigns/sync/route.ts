import { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { metaCampaigns, metaConnections } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { fetchAdAccountCampaignStatuses } from '@/lib/meta/graph'

const syncSchema = z.object({
  adAccountId: z.string().min(1).max(30).regex(/^\d+$/).optional(),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('adAccountId must contain only digits', 'VALIDATION_ERROR', 400)
    }

    const [connection] = await db
      .select({
        id: metaConnections.id,
        pageToken: metaConnections.pageToken,
        adAccountId: metaConnections.adAccountId,
      })
      .from(metaConnections)
      .where(
        and(
          eq(metaConnections.tenantId, ctx.tenant.id),
          eq(metaConnections.status, 'active'),
        ),
      )
      .orderBy(asc(metaConnections.createdAt), asc(metaConnections.id))
      .limit(1)

    if (!connection) {
      return errorResponse('No active Meta connection found', 'NOT_FOUND', 404)
    }

    const adAccountId = parsed.data.adAccountId ?? connection.adAccountId
    if (!adAccountId) {
      return errorResponse('Select an ad account before syncing campaigns', 'AD_ACCOUNT_REQUIRED', 400)
    }

    await db
      .update(metaConnections)
      .set({ adAccountId, updatedAt: new Date() })
      .where(
        and(
          eq(metaConnections.id, connection.id),
          eq(metaConnections.tenantId, ctx.tenant.id),
        ),
      )

    const campaigns = await fetchAdAccountCampaignStatuses(
      adAccountId,
      connection.pageToken,
    )
    if (!campaigns) {
      return errorResponse('Failed to fetch campaigns from Meta', 'META_CAMPAIGNS_UNAVAILABLE', 502)
    }

    const activeCampaigns = campaigns.filter(
      (campaign) => campaign.status.toUpperCase() === 'ACTIVE',
    )
    const added = activeCampaigns.length > 0
      ? await db
          .insert(metaCampaigns)
          .values(
            activeCampaigns.map((campaign) => ({
              connectionId: connection.id,
              campaignId: campaign.id,
              campaignName: campaign.name,
              status: campaign.status,
            })),
          )
          .onConflictDoNothing({ target: metaCampaigns.campaignId })
          .returning({ id: metaCampaigns.id })
      : []

    await Promise.all(
      campaigns.map((campaign) =>
        db
          .update(metaCampaigns)
          .set({
            campaignName: campaign.name,
            status: campaign.status,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(metaCampaigns.connectionId, connection.id),
              eq(metaCampaigns.campaignId, campaign.id),
            ),
          ),
      ),
    )

    return successResponse({ addedCount: added.length })
  })
}
