import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads, leadCoAssignments } from '@/db/schema'
import { hasElevatedScope, type MemberScope } from '@/lib/member-scope'

export async function getLeadInTenant(leadId: string, tenantId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
  return lead ?? null
}

/** Default PRO: assigned leads only. Co-assignees also get access. Admin: any lead in workspace. */
export async function getLeadForMemberAction(
  leadId: string,
  tenantId: string,
  scope: MemberScope,
) {
  const lead = await getLeadInTenant(leadId, tenantId)
  if (!lead) return null
  if (hasElevatedScope(scope)) return lead             // ADMIN: always
  if (lead.assignedTo === scope.dbUserId) return lead  // primary owner

  // Check co-assignment: B also gets full access
  const [coAssignment] = await db
    .select({ id: leadCoAssignments.id })
    .from(leadCoAssignments)
    .where(and(
      eq(leadCoAssignments.leadId, leadId),
      eq(leadCoAssignments.assignedUserId, scope.dbUserId),
    ))
    .limit(1)
  if (coAssignment) return lead

  return null
}

