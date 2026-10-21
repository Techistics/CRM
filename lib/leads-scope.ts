import { and, eq, inArray, isNull, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

export function leadsVisibleWhere(tenantId: string, scope: MemberScope): SQL {
  const inTenant = and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return inTenant

  return and(inTenant, eq(leads.assignedTo, scope.dbUserId))!
}


export function leadIdsInScopeWhere(tenantId: string, leadIds: string[], scope: MemberScope) {
  const base = and(eq(leads.tenantId, tenantId), inArray(leads.id, leadIds), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return base

  return and(base, eq(leads.assignedTo, scope.dbUserId))!
}
