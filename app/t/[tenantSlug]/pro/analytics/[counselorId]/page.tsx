import { requirePermissionSession } from '@/lib/tenant-server'
import CounselorDrilldownPage from '../../../admin/analytics/[counselorId]/page'

export default async function ProCounselorDrilldownPage() {
  await requirePermissionSession('analytics.view')
  return <CounselorDrilldownPage />
}
