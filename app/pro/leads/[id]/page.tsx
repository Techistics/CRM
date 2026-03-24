import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { leads, leadActivities, users } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getProDbUser } from '@/lib/app-user'
import ProLeadDetailClient from './ProLeadDetailClient'

export default async function ProLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const dbUser = await getProDbUser(userId)
  if (!dbUser) redirect('/request-role')

  const { id } = await params

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.assignedTo, dbUser.id)))

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
    .where(eq(leadActivities.leadId, id))
    .orderBy(desc(leadActivities.createdAt))

  return <ProLeadDetailClient lead={lead} activities={activities} />
}
