import { requireTenantAdminSession } from '@/lib/tenant-server'
import PipelineSetupClient from './PipelineSetupClient'

export default async function PipelineSetupPage() {
  const { tenant } = await requireTenantAdminSession()
  return <PipelineSetupClient tenantName={tenant.name} />
}

