import { notFound } from 'next/navigation'
import { db } from '@/db'
import { leads, leadActivities, users, tenantMembers } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import ProLeadDetailClient from './ProLeadDetailClient'
import { requireTenantSession } from '@/lib/tenant-server'

export default async function ProLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant, dbUserId } = await requireTenantSession()
  const { id } = await params

  const [lead] = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      country: leads.country,
      stage: leads.stage,
      primaryStage: leads.primaryStage,
      lastQualification: leads.lastQualification,
      grades: leads.grades,
      source: leads.source,
      rawData: leads.rawData,
      assignedTo: leads.assignedTo,
      tenantId: leads.tenantId,
      createdBy: leads.createdBy,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      lastContactedAt: leads.lastContactedAt,
      intakeMonth: leads.intakeMonth,
      destinationCountry: leads.destinationCountry,
      programOfInterest: leads.programOfInterest,
      isDeadManual: leads.isDeadManual,
      deadReason: leads.deadReason,
      dealValue: leads.dealValue,
      dealCurrency: leads.dealCurrency,
    })
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.tenantId, tenant.id),
      ),
    )

  if (!lead) notFound()

  const activities = await db
    .select({
      id: leadActivities.id,
      type: leadActivities.type,
      fromStage: leadActivities.fromStage,
      toStage: leadActivities.toStage,
      note: leadActivities.note,
      createdAt: leadActivities.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(leadActivities)
    .leftJoin(users, eq(leadActivities.userId, users.id))
    .where(
      and(
        eq(leadActivities.leadId, id),
        eq(leadActivities.tenantId, tenant.id),
      ),
    )
    .orderBy(desc(leadActivities.createdAt))

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(eq(tenantMembers.tenantId, tenant.id))

  return (
    <ProLeadDetailClient
      lead={lead}
      activities={activities}
      allUsers={allUsers}
      currentUser={{ id: dbUserId }}
    />
  )
}
