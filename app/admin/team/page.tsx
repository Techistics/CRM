import { db } from '@/db'
import { users, leads } from '@/db/schema'
import { eq, count, and } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Get all pro users with their lead counts
  const proUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'pro'))

  // Get lead counts per user
  const leadCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .groupBy(leads.assignedTo)

  const activeCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(
      and(
        eq(leads.stage, 'new_lead'),
      )
    )
    .groupBy(leads.assignedTo)

  const paidCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(eq(leads.stage, 'paid'))
    .groupBy(leads.assignedTo)

  // Map counts to users
  const teamData = proUsers.map((user) => ({
    ...user,
    totalLeads: leadCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
    activeLeads: activeCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
    paidLeads: paidCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Team</h1>
          <p className="text-gray-400 text-sm mt-1">
            {proUsers.length} pro agent{proUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400">
          Add agents via{' '}
          <span className="text-white font-medium">Clerk Dashboard → Users → Create</span>
        </div>
      </div>

      {teamData.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No pro agents yet.</p>
          <p className="text-gray-600 text-xs mt-2">
            Create a user in Clerk, set their metadata to{' '}
            <code className="bg-gray-800 px-1 rounded">
              {'{ "role": "pro" }'}
            </code>
            , then run the sync script.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Total Agents</p>
              <p className="text-white text-2xl font-semibold mt-1">{proUsers.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Total Assigned Leads</p>
              <p className="text-white text-2xl font-semibold mt-1">
                {teamData.reduce((sum, u) => sum + Number(u.totalLeads), 0)}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Total Paid</p>
              <p className="text-emerald-400 text-2xl font-semibold mt-1">
                {teamData.reduce((sum, u) => sum + Number(u.paidLeads), 0)}
              </p>
            </div>
          </div>

          {/* Agent cards */}
          <div className="grid grid-cols-2 gap-4">
            {teamData.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                {/* Agent header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-semibold text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{agent.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{agent.email}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md">
                    Pro Agent
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total Leads', value: agent.totalLeads, color: 'text-white' },
                    { label: 'New Leads', value: agent.activeLeads, color: 'text-blue-400' },
                    { label: 'Paid', value: agent.paidLeads, color: 'text-emerald-400' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-gray-800/60 rounded-lg p-3 text-center"
                    >
                      <p className={`text-xl font-semibold ${stat.color}`}>
                        {Number(stat.value)}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar — leads converted */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Conversion rate</span>
                    <span>
                      {agent.totalLeads > 0
                        ? Math.round((Number(agent.paidLeads) / Number(agent.totalLeads)) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width:
                          agent.totalLeads > 0
                            ? `${Math.round((Number(agent.paidLeads) / Number(agent.totalLeads)) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* View leads link */}
                <a
                  href={`/admin/leads?assignedTo=${agent.id}`}
                  className="mt-4 block text-center text-xs text-gray-500 hover:text-gray-300 transition-colors pt-4 border-t border-gray-800"
                >
                  View assigned leads →
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}