import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads } from '@/db/schema'
import type { TenantAppRole } from '@/lib/tenant-membership'

export async function getLeadInTenant(leadId: string, tenantId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
  return lead ?? null
}

/** Agents may only act on leads assigned to them; tenant admins may act on any lead in the workspace. */
export async function getLeadForMemberAction(
  leadId: string,
  tenantId: string,
  role: TenantAppRole,
  dbUserId: string,
) {
  const lead = await getLeadInTenant(leadId, tenantId)
  if (!lead) return null
  if (role === 'ADMIN') return lead
  if (lead.assignedTo === dbUserId) return lead
  return null
}
