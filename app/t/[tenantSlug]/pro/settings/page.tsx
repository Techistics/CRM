import { requireTenantSession } from '@/lib/tenant-server'
import { redirect } from 'next/navigation'
import ProSettingsClient from '../general/ProSettingsClient'

export default async function ProSettingsPage() {
  const ctx = await requireTenantSession()
  if (ctx.role !== 'PRO' && ctx.role !== 'ADMIN') redirect('/sign-in')
  return <ProSettingsClient />
}