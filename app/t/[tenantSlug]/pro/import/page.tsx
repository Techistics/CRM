import { requirePermissionSession } from '@/lib/tenant-server'
// Import the component directly instead of using next/dynamic
import ImportPage from '../../admin/import/page'

export default async function ProImportPage() {
  // 1. Run the permission check safely on the server
  await requirePermissionSession('import.leads')
  
  // 2. Render the page
  return <ImportPage />
}