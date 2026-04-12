import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { resolveTenantAccess } from '@/lib/tenant-access'
import { getTenantBySlug } from '@/lib/tenant-server'

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

  const actor = await resolveTenantAccess(userId, tenant)
  if (!actor) redirect('/no-access?reason=not-in-org')

  const base = `/t/${tenantSlug}`
  if (actor.role === 'tenant_admin') redirect(`${base}/admin/overview`)
  redirect(`${base}/pro/overview`)
}
