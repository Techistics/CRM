import { sql, type SQL } from 'drizzle-orm'

import { leads } from '@/db/schema'

export function dashboardLeadVisibilityFilter(excludeClosed = false): SQL {
  if (!excludeClosed) return sql`TRUE`

  return sql`
    ${leads.primaryStage} NOT IN ('paid', 'cancelled', 'dead', 'closed', 'closed_won', 'closed_lost')
    AND ${leads.stage} NOT IN ('paid', 'cancelled', 'dead', 'closed', 'closed_won', 'closed_lost')
    AND NOT EXISTS (
      SELECT 1
      FROM pipeline_sub_statuses pss
      WHERE pss.id = ${leads.subStatusId}
        AND pss.type IN ('closed_won', 'closed_lost')
    )
  `
}
