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
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {dbUser.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'My Total Leads', value: myLeads.length },
          { label: 'Active', value: activeLeads.length },
          { label: 'Follow Ups', value: followUps.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* My leads table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-light text-brand flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            Recent Leads
          </h2>
          
          <Link
            href={tenantPath(tenant.slug, '/pro/leads')}
            className="text-sm font-medium text-brand hover:text-brand-hover bg-brand-light hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            View all →
          </Link>
        </div>
        {myLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium text-slate-700 mb-1">No leads found</p>
            <p className="text-sm text-slate-500">You haven&apos;t been assigned any leads yet.</p>
          </div>
        ) : (
          <div className="crm-table-scroll">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {myLeads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{lead.fullName}</p>
                      {lead.email && (
                        <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{lead.contactNumber ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">{lead.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {LEAD_STAGE_LABELS[lead.stage ?? 'new_lead']}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={tenantPath(tenant.slug, `/pro/leads/${lead.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover transition-colors"
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
