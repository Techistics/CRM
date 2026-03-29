import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/KanbanBoard'
import { syncAppUserFromClerk } from '@/lib/app-user'

export default async function ProKanbanPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const dbUser = await syncAppUserFromClerk(userId)
  if (!dbUser) redirect('/request-role')

  const myLeads = await db
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
    .where(eq(leads.assignedTo, dbUser.id))

  return (
    <KanbanBoard 
      initialLeads={myLeads} 
      baseApiUrl="/api/pro/leads" 
      backUrl="/pro/leads" 
    />
  )
}
