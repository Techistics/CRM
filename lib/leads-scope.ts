import { and, eq, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'
import type { TenantAppRole } from '@/lib/tenant-membership'

/** Tenant-scoped leads filter; agents only see assigned leads. */
export function leadsVisibleWhere(
  tenantId: string,
  role: TenantAppRole,
  dbUserId: string,
): SQL {
  const inTenant = eq(leads.tenantId, tenantId)
  if (role === 'tenant_admin') return inTenant
  return and(inTenant, eq(leads.assignedTo, dbUserId))!
}
