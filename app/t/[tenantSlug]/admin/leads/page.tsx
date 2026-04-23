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
} from 'lucide-react'

import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'
import PageSizeDropdown from '@/components/PageSizeDropdown'
import { STAGE_LABELS } from '@/constants/leads'
import { tenantPath } from '@/lib/tenant-path'
import { TagFilter } from '@/components/lead/TagFilter'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
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
import { apiCall } from '@/lib/utils/api-handler'

type LeadRow = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string | null
  lastQualification: string | null
  assignedTo: string | null
  tags: { id: string; name: string; color: string }[]
}

type Agent = {
  userId: string
  name: string
  email: string
  role: string
  activeLeadCount: number
}

export default function LeadsPage() {
  const router = useRouter()
  const routeParams = useParams<{ tenantSlug: string }>()
  const searchParams = useSearchParams()
  const tenantSlug = routeParams.tenantSlug

  const [leads, setLeads] = useState<LeadRow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

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

  const selectedCount = selectedIds.size
  const selectedAll = leads.length > 0 && leads.every((l) => selectedIds.has(l.id))
  const selectedSome = leads.some((l) => selectedIds.has(l.id))

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
      params.set('tenantSlug', tenantSlug)
      params.set('idsOnly', 'true')
      if (q) params.set('q', q)
      if (stageFilter) params.set('stage', stageFilter)
      if (assignedTo) params.set('assignedTo', assignedTo)
      if (tagsParam) params.set('tags', tagsParam)

      const idsRes = await fetch(`/api/leads?${params.toString()}`)
      const idsData = await idsRes.json()
      const leadIds = idsData.data?.leadIds as string[] | undefined

      if (!leadIds?.length) {
        throw new Error('No leads to export')
      }

      const res = await fetch('/api/leads/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, tenantSlug }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `all-leads-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    }, { successMsg: 'Export downloaded', errorMsg: 'Failed to export leads' })
    setBulkActionLoading(false)
  }

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
          <TagFilter />
          <CreateLeadDialog tenantSlug={tenantSlug} />
          <div className="w-64">
            <SearchInput
              placeholder="Search phone, name, email..."
              className="w-full bg-[#1A2B40] border-[#1A2B40] text-white placeholder:text-slate-300 focus:ring-[#CBEF7F]/50"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={bulkActionLoading}
            className="border-[#1A2B40] bg-white text-[#1A2B40] hover:bg-[#f6f9fd]"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export All
          </Button>
          <Link
            href={tenantPath(tenantSlug, '/admin/import')}
            className="flex items-center gap-1 border border-[#b7df65] bg-[#CBEF7F] text-[#1A2B40] hover:bg-[#bfe873] text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Import Leads
          </Link>
        </div>
      </div>

      {selectedCount > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg mb-3',
            'bg-primary/5 border border-primary/20',
            'animate-in slide-in-from-top-2 duration-200',
          )}
        >
          <span className="text-sm font-medium text-primary">
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
          </span>

          <Separator orientation="vertical" className="h-4 mx-1" />

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

          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void handleBulkExport()} disabled={bulkActionLoading}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

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

          {bulkActionLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}

          <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-24 text-destructive">{error}</div>
      ) : leads.length === 0 ? (
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
                  <th className="text-left text-gray-600 font-semibold px-3 py-4 uppercase tracking-wider text-xs w-8">
                    <Checkbox
                      checked={selectedAll ? true : selectedSome ? 'indeterminate' : false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(leads.map((l) => l.id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Name</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Contact</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">City</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Qualification</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Stage</th>
                  <th className="text-left text-gray-600 font-semibold px-6 py-4 uppercase tracking-wider text-xs">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const stage = STAGE_LABELS[lead.stage ?? 'new_lead']
                  
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(tenantPath(tenantSlug, `/admin/leads/${lead.id}`))}
                      className={cn(
                        'group cursor-pointer border-b border-border/50 hover:bg-muted/40 transition-colors',
                        selectedIds.has(lead.id) && 'bg-primary/5 border-l-2 border-l-primary',
                      )}
                    >
                      <td className="px-3 py-4">
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
                      <td className="px-6 py-4">
                        <p className="text-gray-900 font-semibold">{lead.fullName}</p>
                        {lead.email && (
                          <p className="text-gray-500 text-xs mt-1">{lead.email}</p>
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
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {(assigneeNameById.get(lead.assignedTo) ?? 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700 font-medium">{assigneeNameById.get(lead.assignedTo) ?? 'Unknown'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Unassigned</span>
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
                  if (tagsParam) sp.set('tags', tagsParam)
                  if (stageFilter) sp.set('stage', stageFilter)
                  if (pageSize !== 10) sp.set('pageSize', String(pageSize))
                  sp.set('page', String(p))
                  return `${tenantPath(tenantSlug, '/admin/leads')}?${sp.toString()}`
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