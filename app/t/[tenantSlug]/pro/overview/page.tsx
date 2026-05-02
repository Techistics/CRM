import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { UserMenu } from '@/components/shared/UserMenu'
import Link from 'next/link'
import { requireTenantSession } from '@/lib/tenant-server'
import { tenantPath } from '@/lib/tenant-path'
import { LEAD_STAGE_LABELS } from '@/lib/lead-stage-labels'

export default async function ProOverviewPage() {
  const { tenant, dbUserId } = await requireTenantSession()

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, dbUserId))

  if (!dbUser) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Your profile could not be loaded. Try signing out and back in.
      </div>
    )
  }

  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenant.id),
        eq(leads.assignedTo, dbUserId),
      ),
    )

  const activeLeads = myLeads.filter(
    (l) => l.stage !== 'cancelled' && l.stage !== 'paid'
  )
  const followUps = myLeads.filter((l) => l.stage === 'follow_up')

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {dbUser.name}</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm rounded-full pl-4 pr-1.5 py-1.5">
          <span className="text-sm font-medium text-gray-600">{dbUser.email}</span>
          <UserMenu user={dbUser} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'My Total Leads', value: myLeads.length },
          { label: 'Active', value: activeLeads.length },
          { label: 'Follow Ups', value: followUps.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
            <p className="text-gray-900 text-4xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* My leads table */}
      <div className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            Recent Leads
          </h2>
          
          <Link
            href={tenantPath(tenant.slug, '/pro/leads')}
            className="text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
          >
            View all →
          </Link>
        </div>
        {myLeads.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500 text-sm">
            <div className="text-4xl mb-4 transition-transform hover:scale-110 duration-300 inline-block">📭</div>
            <p className="font-medium text-gray-900 text-lg">No leads found</p>
            <p className="mt-1">You haven&apos;t been assigned any leads yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left text-gray-500 font-medium px-6 py-4">Name</th>
                  <th className="text-left text-gray-500 font-medium px-6 py-4">Contact</th>
                  <th className="text-left text-gray-500 font-medium px-6 py-4">City</th>
                  <th className="text-left text-gray-500 font-medium px-6 py-4">Stage</th>
                  <th className="text-left text-gray-500 font-medium px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {myLeads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-gray-900 font-medium">{lead.fullName}</p>
                      {lead.email && (
                        <p className="text-gray-500 text-xs mt-0.5">{lead.email}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{lead.contactNumber ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.city ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-white border border-gray-200 text-gray-700 font-medium px-2.5 py-1.5 rounded-lg shadow-sm">
                        {LEAD_STAGE_LABELS[lead.stage ?? 'new_lead']}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={tenantPath(tenant.slug, `/pro/leads/${lead.id}`)}
                        className="text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 w-max"
                      >
                        Details
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}