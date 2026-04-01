import { db } from '@/db'
import { users, leads, tenantMembers } from '@/db/schema'
import { eq, count, and } from 'drizzle-orm'

import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function TeamPage() {
  const { tenant } = await requireTenantAdminSession()
  const tScope = eq(leads.tenantId, tenant.id)

  const proUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: tenantMembers.role,
      createdAt: users.createdAt,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(
      and(eq(tenantMembers.tenantId, tenant.id), eq(tenantMembers.role, 'agent')),
    )

  const leadCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(tScope)
    .groupBy(leads.assignedTo)

  const activeCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'new_lead')))
    .groupBy(leads.assignedTo)

  const paidCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'paid')))
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
          <h1 className="text-2xl font-semibold text-[#223955]">Teams</h1>
          <p className="text-[#223955] text-sm mt-1">
            {proUsers.length} pro agent{proUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {teamData.length === 0 ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 text-center">
          <p className="text-gray-600 text-sm font-medium">No pro agents yet.</p>
          <p className="text-gray-500 text-xs mt-2">
            Invite agents to your Clerk organization with the <strong>Member</strong> role, or approve access requests in Permissions.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <p className="text-gray-500 text-sm font-medium">Total Agents</p>
                <div className="p-2 bg-blue-50 text-[#223955] rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-900 text-3xl font-bold mt-4">{proUsers.length}</p>
              <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
                Active in system
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <p className="text-gray-500 text-sm font-medium">Total Assigned Leads</p>
                <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-900 text-3xl font-bold mt-4">
                {teamData.reduce((sum, u) => sum + Number(u.totalLeads), 0)}
              </p>
              <p className="text-gray-500 text-xs font-medium mt-2">
                Across all agents
              </p>
            </div>

            <div className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <p className="text-gray-500 text-sm font-medium">Total Converted (Paid)</p>
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-900 text-3xl font-bold mt-4">
                {teamData.reduce((sum, u) => sum + Number(u.paidLeads), 0)}
              </p>
              <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
                Successful conversions
              </p>
            </div>
          </div>

          {/* Agent cards */}
          <div className="grid grid-cols-2 gap-6">
            {teamData.map((agent) => (
              <div
                key={agent.id}
                className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 group relative overflow-hidden flex flex-col"
              >
                {/* Subtle header background gradient just for design flair */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Agent header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-500 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">{agent.name}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{agent.email}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2.5 py-1 rounded-full border border-blue-100 shadow-sm">
                    Pro Agent
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Total', value: agent.totalLeads, color: 'text-gray-900', bg: 'bg-gray-50' },
                    { label: 'New', value: agent.activeLeads, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                    { label: 'Paid', value: agent.paidLeads, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`${stat.bg} border border-gray-100 rounded-xl p-3 text-center transition-colors group-hover:border-gray-200`}
                    >
                      <p className={`text-xl font-bold ${stat.color}`}>
                        {Number(stat.value)}
                      </p>
                      <p className="text-gray-500 text-xs font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar — leads converted */}
                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                    <span>Conversion rate</span>
                    <span className="text-gray-900 font-semibold">
                      {agent.totalLeads > 0
                        ? Math.round((Number(agent.paidLeads) / Number(agent.totalLeads)) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
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
                  className="mt-6 flex justify-center items-center gap-1 group/link text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors pt-4 border-t border-gray-100"
                >
                  View assigned leads 
                  <span className="transition-transform group-hover/link:translate-x-1">→</span>
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}