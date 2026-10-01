import { requireTenantSession } from '@/lib/tenant-server'
import GeneralSettingsClient from './ProSettingsClient'

export default async function GeneralSettingsPage() {
  const { tenant } = await requireTenantSession()

  return <GeneralSettingsClient />
}
