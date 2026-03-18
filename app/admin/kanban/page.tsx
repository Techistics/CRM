import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import KanbanBoard from './KanbanBoard'

export default async function KanbanPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

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

  return <KanbanBoard initialLeads={allLeads} />
}