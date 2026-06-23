import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

export async function getLeadInTenant(leadId: string, tenantId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
  return lead ?? null
}

/** Default PRO: assigned leads only. Custom role or admin: any lead in workspace. */
export async function getLeadForMemberAction(
  leadId: string,
  tenantId: string,
  scope: MemberScope,
) {
  const lead = await getLeadInTenant(leadId, tenantId)
  if (!lead) return null
  if (hasElevatedScope(scope)) return lead
  if (lead.assignedTo === scope.dbUserId) return lead
  return null
}
