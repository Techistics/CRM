import { requirePermissionSession } from '@/lib/tenant-server'
import ProLeadsPageClient from './ProLeadsPageClient'

export default async function ProLeadsPage() {
  await requirePermissionSession('leads.view')
  return <ProLeadsPageClient />
}
