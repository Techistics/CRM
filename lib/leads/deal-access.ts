import { can, type Permission } from '@/lib/authz'
import type { TenantAppRole } from '@/lib/tenant-membership'

export function canViewPayments(role: TenantAppRole, permissions: Permission[]): boolean {
  return role === 'ADMIN' || can(permissions, 'payments.view')
}

export function canEditPayments(role: TenantAppRole, permissions: Permission[]): boolean {
  return role === 'ADMIN' || can(permissions, 'payments.edit')
}

/** Remove pricing fields from API payloads when the member lacks payments.view. */
export function stripDealFields<T extends Record<string, unknown>>(
  lead: T,
  role: TenantAppRole,
  permissions: Permission[],
): T {
  if (canViewPayments(role, permissions)) return lead
  const { dealValue: _dv, dealCurrency: _dc, ...rest } = lead
  return rest as T
}

export function stripDealFieldsFromList<T extends Record<string, unknown>>(
  leads: T[],
  role: TenantAppRole,
  permissions: Permission[],
): T[] {
  if (canViewPayments(role, permissions)) return leads
  return leads.map((lead) => stripDealFields(lead, role, permissions))
}
