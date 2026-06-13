import { requirePermissionSession } from '@/lib/tenant-server'
import TemplatesPage from '../../admin/templates/page'

export default async function ProTemplatesPage() {
  await requirePermissionSession('templates.manage')
  return <TemplatesPage />
}