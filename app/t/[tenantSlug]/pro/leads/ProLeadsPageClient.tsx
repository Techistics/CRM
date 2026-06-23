'use client'

import { LeadsDashboard } from '@/components/leads/LeadsDashboard'

export default function ProLeadsPageClient({
  tenantWideAccess = false,
  canDelete = false,
  canEditPayments = false,
}: {
  tenantWideAccess?: boolean
  canDelete?: boolean
  canEditPayments?: boolean
}) {
  return (
    <LeadsDashboard
      role="PRO"
      tenantWideAccess={tenantWideAccess}
      canDelete={canDelete}
      canEditPayments={canEditPayments}
    />
  )
}
