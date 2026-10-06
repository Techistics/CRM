import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

export function leadsVisibleWhere(tenantId: string, scope: MemberScope): SQL {
  const inTenant = and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return inTenant
  
  const isNotClosed = sql`NOT EXISTS (
    SELECT 1 FROM pipeline_sub_statuses pss
    WHERE pss.id = ${leads.subStatusId}
      AND pss.type IN ('closed_won', 'closed_lost')
  )`
  
  return and(inTenant, eq(leads.assignedTo, scope.dbUserId), isNotClosed)!
}


export function leadIdsInScopeWhere(tenantId: string, leadIds: string[], scope: MemberScope) {
  const base = and(eq(leads.tenantId, tenantId), inArray(leads.id, leadIds), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return base
  
  const isNotClosed = sql`NOT EXISTS (
    SELECT 1 FROM pipeline_sub_statuses pss
    WHERE pss.id = ${leads.subStatusId}
      AND pss.type IN ('closed_won', 'closed_lost')
  )`
  
  return and(base, eq(leads.assignedTo, scope.dbUserId), isNotClosed)!
}
