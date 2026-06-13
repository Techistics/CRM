import { requirePermissionSession } from '@/lib/tenant-server'
import ProAnalyticsClient from './ProAnalyticsClient'

export default async function ProAnalyticsPage() {
  await requirePermissionSession('analytics.view')
  return <ProAnalyticsClient />
}
