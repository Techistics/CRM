import { requirePermissionSession } from '@/lib/tenant-server'
import PipelineSetupClient from './PipelineSetupClient'

export default async function PipelineSetupPage() {
  const { tenant } = await requirePermissionSession('teams.manage')
  return <PipelineSetupClient tenantName={tenant.name} />
}

