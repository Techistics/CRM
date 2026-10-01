import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leadRevenues, leads, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET() {
  const ctx = await requirePermissionApi('finance.view')
  if (!ctx.ok) return ctx.response

  const rows = await db
    .select({
      id: leadRevenues.id,
      leadId: leadRevenues.leadId,
      leadName: leads.fullName,
      university: leadRevenues.university,
      country: leadRevenues.country,
      intakeMonth: leadRevenues.intakeMonth,
      intakeYear: leadRevenues.intakeYear,
      counselorFee: leadRevenues.counselorFee,
      universityFee: leadRevenues.universityFee,
      slips: leadRevenues.slips,
      createdAt: leadRevenues.createdAt,
      createdByName: users.name,
    })
    .from(leadRevenues)
    .leftJoin(leads, eq(leadRevenues.leadId, leads.id))
    .leftJoin(users, eq(leadRevenues.createdBy, users.id))
    .where(eq(leadRevenues.tenantId, ctx.tenant.id))
    .orderBy(desc(leadRevenues.createdAt))

  return NextResponse.json({ records: rows })
}
