import { and, eq, inArray, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

/** Tenant-scoped leads filter; default PRO sees assigned leads only. */
export function leadsVisibleWhere(tenantId: string, scope: MemberScope): SQL {
  const inTenant = eq(leads.tenantId, tenantId)
  if (hasElevatedScope(scope)) return inTenant
  return and(inTenant, eq(leads.assignedTo, scope.dbUserId))!
}

/** Restrict bulk lead IDs to those the member may access. */
export function leadIdsInScopeWhere(tenantId: string, leadIds: string[], scope: MemberScope) {
  const base = and(eq(leads.tenantId, tenantId), inArray(leads.id, leadIds))!
  if (hasElevatedScope(scope)) return base
  return and(base, eq(leads.assignedTo, scope.dbUserId))!
}
