import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { clerkClient } from '@clerk/nextjs/server'

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new_lead:         { label: 'New Lead',       color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  unresponsive:     { label: 'Unresponsive',   color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  follow_up:        { label: 'Follow Up',      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  docs_received:    { label: 'Docs Received',  color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  options_sent:     { label: 'Options Sent',   color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  final_decision:   { label: 'Final Decision', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  walkin_booked:    { label: 'Walk-in Booked', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  walkin_conducted: { label: 'Walk-in Done',   color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  cancelled:        { label: 'Cancelled',      color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  paid:             { label: 'Paid',           color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

export default async function ProLeadsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [dbUser] = await db.select().from(users).where(eq(users.email, email))
  if (!dbUser) redirect('/sign-in')

  const myLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.assignedTo, dbUser.id))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">My Leads</h1>
        <p className="text-gray-400 text-sm mt-1">{myLeads.length} leads assigned to you</p>
      </div>

      {myLeads.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          No leads assigned to you yet.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Contact</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">City</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Qualification</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Stage</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {myLeads.map((lead, i) => {
                const stage = STAGE_LABELS[lead.stage ?? 'new_lead']
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-gray-800/10'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{lead.fullName}</p>
                      {lead.email && (
                        <p className="text-gray-500 text-xs mt-0.5">{lead.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{lead.contactNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{lead.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{lead.lastQualification ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md border ${stage.color}`}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/pro/leads/${lead.id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}