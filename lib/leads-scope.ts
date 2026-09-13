import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

/** Tenant-scoped leads filter; default PRO sees assigned leads and co-assigned leads. */
export function leadsVisibleWhere(tenantId: string, scope: MemberScope): SQL {
  const inTenant = and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return inTenant
  // PRO: primary owner OR co-assigned via lead_co_assignments
  return and(
    inTenant,
    or(
      eq(leads.assignedTo, scope.dbUserId),
      sql`EXISTS (
        SELECT 1 FROM lead_co_assignments
        WHERE lead_co_assignments.lead_id = ${leads.id}
          AND lead_co_assignments.assigned_user_id = ${scope.dbUserId}
      )`,
    ),
  )!
}

/** Restrict bulk lead IDs to those the member may access (including co-assigned). */
export function leadIdsInScopeWhere(tenantId: string, leadIds: string[], scope: MemberScope) {
  const base = and(eq(leads.tenantId, tenantId), inArray(leads.id, leadIds), isNull(leads.deletedAt))!
  if (hasElevatedScope(scope)) return base
  return and(
    base,
    or(
      eq(leads.assignedTo, scope.dbUserId),
      sql`EXISTS (
        SELECT 1 FROM lead_co_assignments
        WHERE lead_co_assignments.lead_id = ${leads.id}
          AND lead_co_assignments.assigned_user_id = ${scope.dbUserId}
      )`,
    ),
  )!
}
