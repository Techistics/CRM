import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function GET() {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const myLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, ctx.tenant.id),
        eq(leads.assignedTo, ctx.dbUserId),
      ),
    )

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, ctx.dbUserId))

  return NextResponse.json({
    leads: myLeads,
    user: userRow,
  })
}
