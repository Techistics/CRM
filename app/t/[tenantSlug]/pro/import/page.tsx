import { requirePermissionSession } from '@/lib/tenant-server'
import { can } from '@/lib/authz'
import ImportPage from '../../admin/import/page'

export default async function ProImportPage() {
  const ctx = await requirePermissionSession('import.leads')
  return (
    <ImportPage
      canDeleteBatches={can(ctx.permissions, 'leads.delete')}
      leadsListPath={`/t/${ctx.tenant.slug}/pro/leads`}
    />
  )
}
