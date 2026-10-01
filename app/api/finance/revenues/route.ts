import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leadRevenues, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requirePermissionApi } from '@/lib/tenant-api'

export async function GET(request: Request) {
  const ctx = await requirePermissionApi('finance.view')
  if (!ctx.ok) return ctx.response

  const revenuesData = await db
    .select({
      id: leadRevenues.id,
      counselorFee: leadRevenues.counselorFee,
      universityFee: leadRevenues.universityFee,
      country: leadRevenues.country,
      createdBy: leadRevenues.createdBy,
      counselorName: users.name,
    })
    .from(leadRevenues)
    .leftJoin(users, eq(leadRevenues.createdBy, users.id))
    .where(eq(leadRevenues.tenantId, ctx.tenant.id))

  return NextResponse.json(revenuesData)
}
