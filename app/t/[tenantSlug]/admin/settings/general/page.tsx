import { requirePermissionSession } from '@/lib/tenant-server'
import GeneralSettingsClient from './GeneralSettingsClient'

export default async function GeneralSettingsPage() {
  const { tenant } = await requirePermissionSession('teams.manage')

  return <GeneralSettingsClient tenant={tenant} />
}
