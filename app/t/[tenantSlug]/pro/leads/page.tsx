import { requirePermissionSession } from '@/lib/tenant-server'
import { hasElevatedScope, toMemberScope } from '@/lib/member-scope'
import { can } from '@/lib/authz'
import { canEditPayments } from '@/lib/leads/deal-access'
import ProLeadsPageClient from './ProLeadsPageClient'

export default async function ProLeadsPage() {
  const ctx = await requirePermissionSession('leads.view')
  return (
    <ProLeadsPageClient
      tenantWideAccess={hasElevatedScope(toMemberScope(ctx))}
      canDelete={can(ctx.permissions, 'leads.delete')}
      canEditPayments={canEditPayments(ctx.role, ctx.permissions)}
    />
  )
}
