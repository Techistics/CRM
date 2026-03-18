import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params

  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
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
    })
    .from(leadActivities)
    .leftJoin(users, eq(leadActivities.userId, users.id))
    .where(eq(leadActivities.leadId, id))
    .orderBy(desc(leadActivities.createdAt))

  const allUsers = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)

  return (
    <LeadDetailClient
      lead={lead}
      activities={activities}
      allUsers={allUsers}
    />
  )
}