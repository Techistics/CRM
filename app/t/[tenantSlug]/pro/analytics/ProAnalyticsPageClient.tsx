'use client'

import CounselorAnalyticsDashboard from '@/components/analytics/CounselorAnalyticsDashboard'
import ProAnalyticsClient from './ProAnalyticsClient'

export default function ProAnalyticsPageClient({
  elevated,
}: {
  elevated: boolean
}) {
  if (elevated) {
    return (
      <CounselorAnalyticsDashboard
        leadsPathPrefix="pro"
        enableCounselorDrilldownRoute={false}
      />
    )
  }
  return <ProAnalyticsClient />
}
