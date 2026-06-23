import { requirePermissionSession } from '@/lib/tenant-server'
import { hasElevatedScope, toMemberScope } from '@/lib/member-scope'
import ProAnalyticsPageClient from './ProAnalyticsPageClient'

export default async function ProAnalyticsPage() {
  const ctx = await requirePermissionSession('analytics.view')
  return (
    <ProAnalyticsPageClient elevated={hasElevatedScope(toMemberScope(ctx))} />
  )
}
