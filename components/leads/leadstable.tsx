'use client'

import { memo } from 'react'
import { Loader2 } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { getStageInfo } from '@/constants/pipeline-stages'
import { getHeatLevel, heatConfig } from '@/lib/leads/heat'
import { cn } from '@/lib/utils'
import { LeadRow } from '@/types/LeadsDashboard'
import type { StageInfo, LeadsTableProps } from '@/types/leads'

export type { StageInfo, LeadsTableProps }

const LeadTableRow = memo(function LeadTableRow({
  lead,
  isSelected,
  stageInfo,
  assigneeName,
  onToggleSelect,
  onRowClick,
}: {
  lead: LeadRow
  isSelected: boolean
  stageInfo: StageInfo
  assigneeName: string | null
  onToggleSelect: (id: string, checked: boolean) => void
  onRowClick: (id: string) => void
}) {
  const heat = getHeatLevel(
    lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
    new Date(lead.createdAt),
    lead.isDeadManual,
  )

  return (
    <tr
      onClick={() => onRowClick(lead.id)}
      className={cn(
        'group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800',
        isSelected && 'bg-brand-light/50 border-l-2 border-l-brand',
      )}
    >
      <td className="px-3 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(lead.id, Boolean(checked))}
          aria-label={`Select ${lead.fullName}`}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.fullName}</p>
        {lead.email && <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {lead.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}
              >
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {lead.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-muted">
                +{lead.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{lead.contactNumber ?? '—'}</td>
      <td className="hidden px-4 py-3 text-sm text-slate-600 dark:text-slate-400 md:table-cell">{lead.city ?? '—'}</td>
      <td className="hidden px-4 py-3 text-sm text-slate-600 dark:text-slate-400 lg:table-cell">{lead.lastQualification ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${stageInfo.badgeClasses} font-medium tracking-wide`}>
          {stageInfo.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', heat === 'dead' && 'animate-pulse', heatConfig[heat].dot)} />
          <span className={cn('text-xs font-medium', heatConfig[heat].color)}>{heatConfig[heat].label}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        {lead.assignedTo ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-light text-brand flex items-center justify-center font-semibold text-xs">
              {(assigneeName ?? 'U').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300">{assigneeName ?? 'Unknown'}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">Unassigned</span>
        )}
      </td>
    </tr>
  )
})

export function LeadsTable({
  leads,
  loading,
  error,
  totalLeads,
  isAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  stageInfoMap,
  assigneeNameById,
  onRowClick,
}: LeadsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-24 text-destructive">{error}</div>
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500">
        {totalLeads === 0
          ? isAdmin ? 'No leads yet. Import a CSV to get started.' : 'No leads assigned to you yet.'
          : 'No leads found for this search/page.'}
      </div>
    )
  }

  const selectedAll = leads.every((l) => selectedIds.has(l.id))
  const selectedSome = leads.some((l) => selectedIds.has(l.id))

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] shadow-crm-sm">
      <div className="crm-table-scroll">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-8">
                <Checkbox
                  checked={selectedAll ? true : selectedSome ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">City</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">Qualification</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <LeadTableRow
                key={lead.id}
                lead={lead}
                isSelected={selectedIds.has(lead.id)}
                stageInfo={stageInfoMap.get(lead.stage ?? '') ?? getStageInfo(lead.stage)}
                assigneeName={lead.assignedTo ? assigneeNameById.get(lead.assignedTo) ?? null : null}
                onToggleSelect={onToggleSelect}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}