import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { count, eq, or, ilike, and } from 'drizzle-orm'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'
import PageSizeDropdown from '@/components/PageSizeDropdown'
import { STAGE_LABELS } from '@/constants/leads'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string; page?: string; q?: string; pageSize?: string }>
}) {
  const { tenant } = await requireTenantAdminSession()
  const tScope = eq(leads.tenantId, tenant.id)

  const { assignedTo, page, q, pageSize: pageSizeParam } = await searchParams

  const pageSize = Number(pageSizeParam) || 10
  const currentPage = (() => {
    const n = Number(page ?? '1')
    if (!Number.isFinite(n) || n < 1) return 1
    return Math.floor(n)
  })()
  const offset = (currentPage - 1) * pageSize

  const baseSelect = db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      lastQualification: leads.lastQualification,
      createdAt: leads.createdAt,
      assigneeName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))

  const queryFilter = q ? or(
    ilike(leads.fullName, `%${q}%`),
    ilike(leads.contactNumber, `%${q}%`),
    ilike(leads.email, `%${q}%`)
  ) : undefined

  // When coming from "View assigned leads" we only show leads assigned to that agent.
  const pageLeads = assignedTo
    ? await baseSelect
        .where(
          queryFilter
            ? and(tScope, eq(leads.assignedTo, assignedTo), queryFilter)
            : and(tScope, eq(leads.assignedTo, assignedTo)),
        )
        .orderBy(leads.createdAt)
        .limit(pageSize)
        .offset(offset)
    : queryFilter
      ? await baseSelect
          .where(and(tScope, queryFilter))
          .orderBy(leads.createdAt)
          .limit(pageSize)
          .offset(offset)
      : await baseSelect
          .where(tScope)
          .orderBy(leads.createdAt)
          .limit(pageSize)
          .offset(offset)

  const countResult = assignedTo
    ? await db
        .select({ total: count(leads.id) })
        .from(leads)
        .where(
          queryFilter
            ? and(tScope, eq(leads.assignedTo, assignedTo), queryFilter)
            : and(tScope, eq(leads.assignedTo, assignedTo)),
        )
    : queryFilter
      ? await db
          .select({ total: count(leads.id) })
          .from(leads)
          .where(and(tScope, queryFilter))
      : await db
          .select({ total: count(leads.id) })
          .from(leads)
          .where(tScope)

  const totalLeads = Number(countResult[0]?.total ?? 0)
  const totalPages = Math.ceil(totalLeads / pageSize)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#223955]">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalLeads} total leads
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-64">
            <SearchInput placeholder="Search phone, name, email..." />
          </div>
          <Link
            href="/admin/import"
            className="flex items-center gap-1 bg-[#223955] hover:bg-[#1a2b40] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Import Leads
          </Link>
        </div>
      </div>

      {pageLeads.length === 0 ? (
        <div className="text-center bg-white border border-gray-200 shadow-sm rounded-2xl py-24 text-gray-500 transition-all hover:shadow-md">
          {totalLeads === 0
            ? 'No leads yet. Import a CSV to get started.'
            : 'No leads found for this search/page.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Contact</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">City</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Qualification</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Stage</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Assigned To</th>
                  <th className="text-right text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageLeads.map((lead) => {
                  const stage = STAGE_LABELS[lead.stage ?? 'new_lead']
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-default"
                    >
                      <td className="px-6 py-4">
                        <p className="text-gray-900 font-semibold">{lead.fullName}</p>
                        {lead.email && (
                          <p className="text-gray-500 text-xs mt-1">{lead.email}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.contactNumber ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.city ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.lastQualification ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${stage.color} font-medium tracking-wide`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lead.assigneeName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {lead.assigneeName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700 font-medium">{lead.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="inline-flex items-center justify-center text-sm font-medium text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-100 transition-all rounded-lg px-3 py-1.5 shadow-sm group-hover:shadow"
                        >
                          View <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pageLeads.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                makeHref={(p) => {
                  const sp = new URLSearchParams()
                  if (assignedTo) sp.set('assignedTo', assignedTo)
                  if (q) sp.set('q', q)
                  if (pageSize !== 10) sp.set('pageSize', String(pageSize))
                  sp.set('page', String(p))
                  return `/admin/leads?${sp.toString()}`
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Rows per page</span>
            <PageSizeDropdown currentSize={pageSize} />
          </div>
        </div>
      )}
    </div>
  )
}