'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  UserCheck,
  ArrowRightLeft,
  Download,
  Trash2,
  ChevronDown,
  X,
  Loader2,
  Filter,
  MoreHorizontal,
  Upload,
} from 'lucide-react'

import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'
import PageSizeDropdown from '@/components/PageSizeDropdown'
import { getStageInfo } from '@/constants/pipeline-stages'
import { tenantPath } from '@/lib/tenant-path'
import { TagFilter } from '@/components/leads/TagFilter'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
import { getHeatLevel, heatConfig } from '@/lib/leads/heat'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiCall } from '@/lib/utils/api-handler'

export type LeadRow = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string | null
  lastContactedAt: string | null
  createdAt: string
  lastQualification: string | null
  assignedTo: string | null
  tags: { id: string; name: string; color: string }[]
}

export type Agent = {
  userId: string
  name: string
  email: string
  role: string
  activeLeadCount: number
}

interface LeadsDashboardProps {
  role: 'ADMIN' | 'PRO'
}

export function LeadsDashboard({ role }: LeadsDashboardProps) {
  const router = useRouter()
  const routeParams = useParams<{ tenantSlug: string }>()
  const searchParams = useSearchParams()
  const tenantSlug = routeParams.tenantSlug
  const isAdmin = role === 'ADMIN'

  const [leads, setLeads] = useState<LeadRow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [heatFilter, setHeatFilter] = useState<string>('all')

  const assignedTo = searchParams.get('assignedTo') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const page = searchParams.get('page') ?? '1'
  const pageSizeParam = searchParams.get('pageSize') ?? '10'
  const tagsParam = searchParams.get('tags') ?? undefined
  const stageFilter = searchParams.get('stage') ?? undefined
  const currentPage = Math.max(1, Number(page) || 1)
  const pageSize = Number(pageSizeParam) || 10
  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize))

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('pageSize', String(pageSize))
      if (q) params.set('q', q)
      if (assignedTo) params.set('assignedTo', assignedTo)
      if (tagsParam) params.set('tags', tagsParam)
      if (stageFilter) params.set('stage', stageFilter)

      const [leadsRes, agentsRes] = await Promise.all([
        fetch(`/api/leads?${params.toString()}`),
        fetch('/api/admin/team-members'),
      ])
      const leadsData = await leadsRes.json()
      const agentsData = await agentsRes.json()

      if (!leadsRes.ok) {
        throw new Error(leadsData.error ?? 'Failed to load leads')
      }
      if (!agentsRes.ok) {
        throw new Error(agentsData.error ?? 'Failed to load agents')
      }

      setLeads(leadsData.data?.leads ?? [])
      setTotalLeads(Number(leadsData.data?.total ?? 0))
      setAgents(agentsData.data?.members ?? [])
      setSelectedIds(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [assignedTo, currentPage, pageSize, q, stageFilter, tagsParam])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredLeads =
    heatFilter === 'all'
      ? leads
      : leads.filter((lead) => {
          const heat = getHeatLevel(
            lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
            new Date(lead.createdAt),
          )
          return heat === heatFilter
        })

  const selectedCount = selectedIds.size
  const selectedAll =
    filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id))
  const selectedSome = filteredLeads.some((l) => selectedIds.has(l.id))

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    agents.forEach((agent) => map.set(agent.userId, agent.name))
    return map
  }, [agents])

  const handleBulkAssign = async (newAssignedTo: string) => {
    setBulkActionLoading(true)
    const count = selectedIds.size
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          assignedTo: newAssignedTo,
          tenantSlug,
        }),
      })
      return res.json()
    }, {
      successMsg: `Assigned ${count} leads`,
      errorMsg: 'Failed to assign leads',
    })
    if (data) {
      setSelectedIds(new Set())
      await fetchData()
      router.refresh()
    }
    setBulkActionLoading(false)
  }

  const handleBulkStage = async (stage: string) => {
    setBulkActionLoading(true)
    const count = selectedIds.size
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          stage,
          tenantSlug,
        }),
      })
      return res.json()
    }, {
      successMsg: `Moved ${count} leads to ${stage}`,
      errorMsg: 'Failed to update stage',
    })
    if (data) {
      setSelectedIds(new Set())
      await fetchData()
      router.refresh()
    }
    setBulkActionLoading(false)
  }

  const handleBulkExport = async () => {
    setBulkActionLoading(true)
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          tenantSlug,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    }, { successMsg: 'Export downloaded', errorMsg: 'Failed to export leads' })
    setBulkActionLoading(false)
    if (!data) return
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const count = selectedIds.size
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          tenantSlug,
        }),
      })
      return res.json()
    }, {
      successMsg: `Deleted ${count} leads`,
      errorMsg: 'Failed to delete leads',
    })
    if (data) {
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)
      await fetchData()
      router.refresh()
    }
    setBulkDeleting(false)
  }

  const handleExportAll = async () => {
    setBulkActionLoading(true)
    await apiCall(async () => {
      const params = new URLSearchParams()
      params.set('idsOnly', 'true')
      if (q) params.set('q', q)
      if (stageFilter) params.set('stage', stageFilter)
      if (assignedTo) params.set('assignedTo', assignedTo)
      if (tagsParam) params.set('tags', tagsParam)

      const idsRes = await fetch(`/api/leads?${params.toString()}`)
      if (!idsRes.ok) {
        const errorData = await idsRes.json()
        throw new Error(errorData.error || 'Failed to fetch lead IDs')
      }
      
      const idsData = await idsRes.json()
      const leadIds = idsData.data?.leadIds as string[] | undefined

      if (!leadIds || leadIds.length === 0) {
        throw new Error('No leads matching the current filters were found.')
      }

      const res = await fetch('/api/leads/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, tenantSlug }),
      })
      if (!res.ok) throw new Error('Export generation failed')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    }, { 
      successMsg: 'Export started', 
      errorMsg: 'Failed to export leads' 
    })
    setBulkActionLoading(false)
  }

  const leadDetailPath = (id: string) => {
    return tenantPath(tenantSlug, `/${role.toLowerCase()}/leads/${id}`)
  }

  return (
    <div className="p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isAdmin ? 'Leads' : 'My Leads'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalLeads} total records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <SearchInput
              placeholder="Search leads..."
              className="w-full h-9 bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <TagFilter />
            <Select value={heatFilter} onValueChange={setHeatFilter}>
              <SelectTrigger className="h-8 w-32 border-none bg-transparent hover:bg-white shadow-none focus:ring-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-gray-500" />
                  <SelectValue placeholder="Heat" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="dead">❄️ Dead</SelectItem>
                <SelectItem value="cold">🌤️ Cold</SelectItem>
                <SelectItem value="warm">☀️ Warm</SelectItem>
                <SelectItem value="hot">🔥 Hot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-lg border-slate-200 hover:bg-slate-50 gap-2 text-sm">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1 rounded-lg shadow-crm-md border-slate-200">
              {isAdmin && (
                <DropdownMenuItem 
                  onClick={handleExportAll} 
                  disabled={bulkActionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <span>Export All CSV</span>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem asChild className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm">
                  <Link href={tenantPath(tenantSlug, '/admin/import')}>
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span>Import Leads</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && <CreateLeadDialog tenantSlug={tenantSlug} />}
        </div>
      </div>

      {selectedCount > 0 && (
        <div
          className={cn(
            'mb-4 flex flex-wrap items-center gap-2 rounded-lg px-4 py-2.5',
            'bg-brand-light border border-brand/20',
            'animate-in slide-in-from-top-2 duration-200',
          )}
        >
          <span className="text-sm font-medium text-brand">
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
          </span>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={bulkActionLoading}>
                  <UserCheck className="h-3.5 w-3.5" />
                  Assign to
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {agents.map((agent) => (
                  <DropdownMenuItem key={agent.userId} onSelect={() => void handleBulkAssign(agent.userId)}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {agent.name[0]?.toUpperCase()}
                      </div>
                      <span>{agent.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={bulkActionLoading}>
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Move to stage
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {[
                'new_lead',
                'unresponsive',
                'follow_up',
                'walkin_booked',
                'docs_received',
                'options_sent',
                'paid',
                'cancelled',
              ].map((stage) => (
                <DropdownMenuItem key={stage} onSelect={() => void handleBulkStage(stage)}>
                  {stage.replace(/_/g, ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void handleBulkExport()} disabled={bulkActionLoading}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkActionLoading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}

          {bulkActionLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}

          <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-24 text-destructive">{error}</div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
          {totalLeads === 0
            ? isAdmin ? 'No leads yet. Import a CSV to get started.' : 'No leads assigned to you yet.'
            : 'No leads found for this search/page.'}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
          No leads match this heat filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-crm-sm">
          <div className="crm-table-scroll">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-8">
                    <Checkbox
                      checked={selectedAll ? true : selectedSome ? 'indeterminate' : false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">City</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">Qualification</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Heat</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => {
                  const stageInfo = getStageInfo(lead.stage)
                  const heat = getHeatLevel(
                    lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
                    new Date(lead.createdAt),
                  )
                  
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(leadDetailPath(lead.id))}
                      className={cn(
                        'group cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100',
                        selectedIds.has(lead.id) && 'bg-brand-light/50 border-l-2 border-l-brand',
                      )}
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedIds)
                            if (checked) next.add(lead.id)
                            else next.delete(lead.id)
                            setSelectedIds(next)
                          }}
                          aria-label={`Select ${lead.fullName}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{lead.fullName}</p>
                        {lead.email && (
                          <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>
                        )}
                        {lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {lead.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color,
                                  border: `1px solid ${tag.color}40`,
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: tag.color }}
                                />
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
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {lead.contactNumber ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
                        {lead.city ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">
                        {lead.lastQualification ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${stageInfo.badgeClasses} font-medium tracking-wide`}>
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              heat === 'dead' && 'animate-pulse',
                              heatConfig[heat].dot,
                            )}
                          />
                          <span className={cn('text-xs font-medium', heatConfig[heat].color)}>
                            {heatConfig[heat].label}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-light text-brand flex items-center justify-center font-semibold text-xs">
                              {(assigneeNameById.get(lead.assignedTo) ?? 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700">{assigneeNameById.get(lead.assignedTo) ?? 'Unknown'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leads.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                makeHref={(p) => {
                  const sp = new URLSearchParams()
                  if (assignedTo) sp.set('assignedTo', assignedTo)
                  if (q) sp.set('q', q)
                  if (tagsParam) sp.set('tags', tagsParam)
                  if (stageFilter) sp.set('stage', stageFilter)
                  if (pageSize !== 10) sp.set('pageSize', String(pageSize))
                  sp.set('page', String(p))
                  return `${tenantPath(tenantSlug, `/${role.toLowerCase()}/leads`)}?${sp.toString()}`
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Rows per page</span>
            <PageSizeDropdown currentSize={pageSize} />
          </div>
        </div>
      )}

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} leads and all their associated activities, reminders, documents, and checklist items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBulkDelete()} disabled={bulkDeleting} className="bg-destructive hover:bg-destructive/90">
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Delete ${selectedIds.size} leads`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
