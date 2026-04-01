import { notFound } from 'next/navigation'

import { TenantOrgSync } from '@/components/tenant/TenantOrgSync'
import { getTenantBySlug, getTenantSlugFromHeaders } from '@/lib/tenant-server'

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
  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  return (
    <>
      <TenantOrgSync clerkOrgId={tenant.clerkOrgId} />
      {children}
    </>
  )
}
