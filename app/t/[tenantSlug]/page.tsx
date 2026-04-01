import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getTenantBySlug } from '@/lib/tenant-server'
import { syncTenantMembership } from '@/lib/tenant-membership'

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) redirect('/')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const m = await syncTenantMembership(userId, tenant)
  if (!m) redirect('/no-access?reason=not-in-org')

  if (m.role === 'tenant_admin') redirect('/admin/overview')
  redirect('/pro/overview')
}
