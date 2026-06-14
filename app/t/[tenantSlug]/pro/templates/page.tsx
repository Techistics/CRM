import { requireTenantSession } from '@/lib/tenant-server'
import TemplatesPage from '../../admin/templates/page'

export default async function ProTemplatesPage() {
  await requireTenantSession()
  return <TemplatesPage />
}