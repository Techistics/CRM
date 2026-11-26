import { sql, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'

export type LeadStatusFilter = 'in_progress' | 'closed_lost'

/**
 * Single source of truth for lead status filtering (same predicate the Leads page uses).
 * "closed" = the lead points at a closed_lost sub-status of this tenant.
 */
export function leadStatusWhere(
  tenantId: string,
  status: LeadStatusFilter,
  stageKey?: string | null,
): SQL {
  const stageCondition = stageKey ? sql` AND pss.stage_key = ${stageKey}` : sql``
  return sql`EXISTS (
    SELECT 1 FROM pipeline_sub_statuses pss
    WHERE pss.id = ${leads.subStatusId}
      AND pss.tenant_id = ${tenantId}
      AND pss.type = ${status}${stageCondition}
  )`
}

export function closedLeadWhere(tenantId: string, stageKey?: string | null): SQL {
  return leadStatusWhere(tenantId, 'closed_lost', stageKey)
}

export function openLeadWhere(tenantId: string): SQL {
  return sql`NOT ${leadStatusWhere(tenantId, 'closed_lost')}`
}
