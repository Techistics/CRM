import { redirect } from 'next/navigation'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { getTenantBySlug } from '@/lib/tenant-server'
import { getSession } from '@/lib/auth'

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) redirect('/')

  const session = await getSession()
  if (!session) redirect('/sign-in')

  const actor = await resolveTenantAccess(session.userId, tenant)
  if (!actor) redirect('/no-access?reason=not-in-org')

  const base = `/t/${tenantSlug}`
  if (actor.role === 'ADMIN') redirect(`${base}/admin/overview`)
  redirect(`${base}/pro/overview`)
}
