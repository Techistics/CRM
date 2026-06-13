import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type MyLead = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string
  reassignedByName: string | null
  createdAt: Date | null
}

export default function ProReassignedLeadsClient({
  leads,
  tenantSlug,
}: {
  leads: MyLead[]
  tenantSlug: string
}) {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reassigned Leads</h1>
        <p className="text-sm text-slate-500 mt-1">Leads reassigned to you — {leads.length} total</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-[#0f172a] dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Reassigned By</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{lead.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{lead.contactNumber ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{lead.city ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{lead.reassignedByName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/t/${tenantSlug}/pro/leads/${lead.id}`}
                    className="text-xs font-medium text-sky-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No leads have been reassigned to you yet. Your admin needs to grant you the 'Receive Reassigned Leads' permission.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
