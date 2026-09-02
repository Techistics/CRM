'use client'

import { LeadsDashboard } from '@/components/leads/LeadsDashboard'

export type ProLeadsPermissions = {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canReceive: boolean
  canViewPayments: boolean
  canEditPayments: boolean
  tenantWideAccess: boolean
}

export default function ProLeadsPageClient({
  permissions,
}: {
  permissions: ProLeadsPermissions
}) {
  return (
    <LeadsDashboard
      role="PRO"
      permissions={permissions}
    />
  )
}
