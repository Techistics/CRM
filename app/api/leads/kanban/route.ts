import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function GET() {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const allLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      lastQualification: leads.lastQualification,
      assigneeName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(eq(leads.tenantId, ctx.tenant.id))

  return NextResponse.json({ leads: allLeads })
}
