import { requireTenantSession } from '@/lib/tenant-server'
import { canViewAllAnalytics, toMemberScope } from '@/lib/member-scope'
import ProAnalyticsPageClient from './ProAnalyticsPageClient'

export default async function ProAnalyticsPage() {
  const ctx = await requireTenantSession()
  return (
    <ProAnalyticsPageClient elevated={canViewAllAnalytics(toMemberScope(ctx))} />
  )
}
