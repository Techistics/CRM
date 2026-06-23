'use client'

import CounselorAnalyticsDashboard from '@/components/analytics/CounselorAnalyticsDashboard'

export default function AdminAnalyticsPage() {
  return <CounselorAnalyticsDashboard leadsPathPrefix="admin" enableCounselorDrilldownRoute />
}
