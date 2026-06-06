import type { TenantAppRole } from '@/lib/tenant-membership'

export function isAdminRole(role: TenantAppRole): boolean {
  return role === 'ADMIN'
}

/** Remove pricing fields from API payloads for non-admin roles. */
export function stripDealFields<T extends Record<string, unknown>>(
  lead: T,
  role: TenantAppRole,
): T {
  if (isAdminRole(role)) return lead
  const { dealValue: _dv, dealCurrency: _dc, ...rest } = lead
  return rest as T
}

export function stripDealFieldsFromList<T extends Record<string, unknown>>(
  leads: T[],
  role: TenantAppRole,
): T[] {
  if (isAdminRole(role)) return leads
  return leads.map((lead) => stripDealFields(lead, role))
}
