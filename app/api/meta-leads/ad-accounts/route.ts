import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { metaConnections } from '@/db/schema'
import { successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { fetchAdAccounts } from '@/lib/meta/graph'

export async function GET() {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const [connection] = await db
      .select({
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
      return successResponse({ accounts: [], adAccountId: null })
    }

    const accounts = await fetchAdAccounts(connection.pageToken)
    return successResponse({
      accounts,
      adAccountId: connection.adAccountId,
    })
  })
}
