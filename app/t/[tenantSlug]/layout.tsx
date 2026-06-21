import { notFound } from 'next/navigation'

import { getTenantBySlug, getTenantSlugFromHeaders } from '@/lib/tenant-server'
import { getSession } from '@/lib/auth'
import { isPlatformSuperAdminUserId } from '@/lib/platform-role'
import { WorkspaceSuspendedScreen } from '@/components/WorkspaceSuspendedScreen'

export default async function TenantSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const headerSlug = await getTenantSlugFromHeaders()
  if (headerSlug && headerSlug !== tenantSlug) {
    notFound()
  }

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) {
    notFound()
  }

  if (tenant.status !== 'active') {
    // SA who entered this workspace via "Enter workspace" can still browse it.
    const session = await getSession()
    const saBypass =
      session != null &&
      (await isPlatformSuperAdminUserId(session.userId)) &&
      session.superAdminActiveTenantId === tenant.id

    if (!saBypass) {
      return <WorkspaceSuspendedScreen />
    }
  }

  return <>{children}</>
}
