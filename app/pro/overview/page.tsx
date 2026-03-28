import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { syncAppUserFromClerk } from '@/lib/app-user'

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead', unresponsive: 'Unresponsive',
  follow_up: 'Follow Up', docs_received: 'Docs Received',
  options_sent: 'Options Sent', final_decision: 'Final Decision',
  walkin_booked: 'Walk-in Booked', walkin_conducted: 'Walk-in Done',
  cancelled: 'Cancelled', paid: 'Paid',
}

export default async function ProOverviewPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const dbUser = await syncAppUserFromClerk(userId)
  if (!dbUser) redirect('/request-role')

  const myLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.assignedTo, dbUser.id))

  const activeLeads = myLeads.filter(
    (l) => l.stage !== 'cancelled' && l.stage !== 'paid'
  )
  const followUps = myLeads.filter((l) => l.stage === 'follow_up')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back, {dbUser.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{dbUser.email}</span>
          <UserButton />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'My Total Leads', value: myLeads.length },
          { label: 'Active', value: activeLeads.length },
          { label: 'Follow Ups', value: followUps.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-semibold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* My leads table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-medium">My Leads</h2>
          
          <Link
            href="/pro/leads"
            className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
          >
            View all →
          </Link>
        </div>
        {myLeads.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-600 text-sm">
            No leads assigned to you yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-6 py-3">Name</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Contact</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">City</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Stage</th>
                <th className="text-left text-gray-500 font-medium px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {myLeads.slice(0, 5).map((lead) => (
                <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/40">
                  <td className="px-6 py-3">
                    <p className="text-white font-medium">{lead.fullName}</p>
                    {lead.email && (
                      <p className="text-gray-500 text-xs">{lead.email}</p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-400">{lead.contactNumber ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-400">{lead.city ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-md">
                      {STAGE_LABELS[lead.stage ?? 'new_lead']}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/pro/leads/${lead.id}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}