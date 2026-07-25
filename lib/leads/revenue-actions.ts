'use server'

import { db } from '@/db'
import { leadRevenues, leads } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function saveLeadRevenue(leadId: string, data: {
  intake: string
  university: string
  country: string
  counselorFee: number
  universityFee: number
}) {
  const ctx = await requireTenantSession()
  const tenant = ctx.tenant
  const userId = ctx.dbUserId

  // Ensure the lead exists and belongs to the tenant
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenant.id)))
    .limit(1)

  if (!lead) {
    throw new Error('Lead not found')
  }

  const [inserted] = await db
    .insert(leadRevenues)
    .values({
      tenantId: tenant.id,
      leadId,
      intake: data.intake,
      university: data.university,
      country: data.country,
      counselorFee: data.counselorFee.toString(),
      universityFee: data.universityFee.toString(),
      createdBy: userId,
    })
    .returning()

  return inserted
}

export async function getLeadRevenues(leadId: string) {
  const ctx = await requireTenantSession()
  const tenant = ctx.tenant

  const revenues = await db
    .select()
    .from(leadRevenues)
    .where(and(eq(leadRevenues.leadId, leadId), eq(leadRevenues.tenantId, tenant.id)))
    .orderBy(desc(leadRevenues.createdAt))

  return revenues
}
