import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { count, eq, or, ilike, and } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string; page?: string; q?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { assignedTo, page, q } = await searchParams

  const pageSize = 10
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
        .where(queryFilter ? and(eq(leads.assignedTo, assignedTo), queryFilter) : eq(leads.assignedTo, assignedTo))
        .orderBy(leads.createdAt)
        .limit(pageSize)
        .offset(offset)
    : queryFilter
      ? await baseSelect
          .where(queryFilter)
          .orderBy(leads.createdAt)
          .limit(pageSize)
          .offset(offset)
      : await baseSelect
          .orderBy(leads.createdAt)
          .limit(pageSize)
          .offset(offset)

  const countResult = assignedTo
    ? await db
        .select({ total: count(leads.id) })
        .from(leads)
        .where(queryFilter ? and(eq(leads.assignedTo, assignedTo), queryFilter) : eq(leads.assignedTo, assignedTo))
    : queryFilter
      ? await db
          .select({ total: count(leads.id) })
          .from(leads)
          .where(queryFilter)
      : await db
          .select({ total: count(leads.id) })
          .from(leads)

  const totalLeads = Number(countResult[0]?.total ?? 0)
  const totalPages = Math.ceil(totalLeads / pageSize)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Leads</h1>
          <p className="text-gray-400 text-sm mt-1">
            {totalLeads} total leads
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SearchInput placeholder="Search phone, name, email..." />
          <Link
            href="/admin/import"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Import Leads
          </Link>
        </div>
      </div>

      {pageLeads.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          {totalLeads === 0
            ? 'No leads yet. Import a CSV to get started.'
            : 'No leads found for this page.'}
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
                <th className="text-left text-gray-500 font-medium px-4 py-3">Assigned To</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageLeads.map((lead, i) => {
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
                    <td className="px-4 py-3 text-gray-400">
                      {lead.contactNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {lead.city ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {lead.lastQualification ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md border ${stage.color}`}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {lead.assigneeName ?? (
                        <span className="text-gray-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageLeads.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            makeHref={(p) => {
              const sp = new URLSearchParams()
              if (assignedTo) sp.set('assignedTo', assignedTo)
              if (q) sp.set('q', q)
              sp.set('page', String(p))
              return `/admin/leads?${sp.toString()}`
            }}
          />
        </div>
      )}
    </div>
  )
}