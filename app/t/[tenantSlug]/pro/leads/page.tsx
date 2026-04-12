import { db } from '@/db'
import { leads } from '@/db/schema'
import { eq, or, ilike, and } from 'drizzle-orm'
import SearchInput from '@/components/SearchInput'

import { STAGE_LABELS } from '@/constants/leads'
import { requireTenantSession } from '@/lib/tenant-server'
import { tenantPath } from '@/lib/tenant-path'

export default async function ProLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { tenant, dbUserId } = await requireTenantSession()

  const { q } = await searchParams

  const queryFilter = q
    ? or(
        ilike(leads.fullName, `%${q}%`),
        ilike(leads.contactNumber, `%${q}%`),
        ilike(leads.email, `%${q}%`),
      )
    : undefined

  const myLeads = await db
    .select()
    .from(leads)
    .where(
      queryFilter
        ? and(
            eq(leads.tenantId, tenant.id),
            eq(leads.assignedTo, dbUserId),
            queryFilter,
          )
        : and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId)),
    )

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            My Leads
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {myLeads.length} leads assigned to you
          </p>
        </div>
        <SearchInput placeholder="Search phone, name, email..." />
      </div>

      {myLeads.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <div className="text-4xl mb-4 transition-transform hover:-translate-y-1 duration-300 inline-block">
            📋
          </div>
          <p className="font-medium text-gray-900 text-lg">No leads found</p>
          <p className="mt-1">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left text-gray-500 font-medium px-6 py-4">
                  Name
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-4 whitespace-nowrap">
                  Contact
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-4">
                  City
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-4 whitespace-nowrap">
                  Qualification
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-4">
                  Stage
                </th>
                <th className="text-left text-gray-500 font-medium px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {myLeads.map((lead) => {
                const stage = STAGE_LABELS[lead.stage ?? 'new_lead']
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-gray-900 font-medium">{lead.fullName}</p>
                      {lead.email && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {lead.email}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {lead.contactNumber ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{lead.city ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {lead.lastQualification ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium ${stage.color}`}
                      >
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={tenantPath(tenant.slug, `/pro/leads/${lead.id}`)}
                        className="text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 w-max"
                      >
                        Details
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
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
