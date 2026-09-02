import { requirePermissionSession } from '@/lib/tenant-server'
import { hasElevatedScope, toMemberScope } from '@/lib/member-scope'
import { can } from '@/lib/authz'
import { canEditPayments as resolveCanEditPayments } from '@/lib/leads/deal-access'
import ProLeadsPageClient from './ProLeadsPageClient'

export default async function ProLeadsPage() {
  const ctx = await requirePermissionSession('leads.view')
  const permissions = {
    canCreate:        can(ctx.permissions, 'leads.create'),
    canEdit:          can(ctx.permissions, 'leads.edit'),
    canDelete:        can(ctx.permissions, 'leads.delete'),
    canAssign:        can(ctx.permissions, 'leads.assign'),
    canReceive:       can(ctx.permissions, 'leads.receive'),
    canViewPayments:  can(ctx.permissions, 'payments.view'),
    canEditPayments:  resolveCanEditPayments(ctx.role, ctx.permissions),
    tenantWideAccess: hasElevatedScope(toMemberScope(ctx)),
  }
  return <ProLeadsPageClient permissions={permissions} />
}
