import { requireTenantAdminSession } from '@/lib/tenant-server'
import GeneralSettingsClient from './GeneralSettingsClient'

export default async function GeneralSettingsPage() {
  const { tenant } = await requireTenantAdminSession()

  return <GeneralSettingsClient tenant={tenant} />
}
