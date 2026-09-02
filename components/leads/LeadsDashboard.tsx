'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Download, Loader2, MoreHorizontal, Upload } from 'lucide-react'

import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'
import PageSizeDropdown from '@/components/PageSizeDropdown'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { tenantPath } from '@/lib/tenant-path'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
import { getHeatLevel } from '@/lib/leads/heat'
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
import { FilterSheet } from '@/components/leads/filtersheet'
import { BulkActionsBar } from '@/components/leads/Bulkactionsbar'
import { LeadsTable } from '@/components/leads/leadstable'
import { Agent, LeadRow } from '@/types/LeadsDashboard'

export type LeadsPermissions = {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canReceive: boolean
  canViewPayments: boolean
  canEditPayments: boolean
  tenantWideAccess: boolean
}

const ADMIN_PERMISSIONS: LeadsPermissions = {
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canAssign: true,
  canReceive: true,
  canViewPayments: true,
  canEditPayments: true,
  tenantWideAccess: true,
}

interface LeadsDashboardProps {
  role: 'ADMIN' | 'PRO'
  permissions?: LeadsPermissions
}

const FETCH_DEBOUNCE_MS = 250

export function LeadsDashboard({
  role,
  permissions: permissionsProp,
}: LeadsDashboardProps) {
  const permissions = role === 'ADMIN' ? ADMIN_PERMISSIONS : (permissionsProp ?? ADMIN_PERMISSIONS)
  const { canCreate, canEdit, canDelete, canAssign, canEditPayments, tenantWideAccess } = permissions
  const router = useRouter()
  const routeParams = useParams<{ tenantSlug: string }>()
  const searchParams = useSearchParams()
  const tenantSlug = routeParams.tenantSlug
  const isAdmin = role === 'ADMIN' || tenantWideAccess

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
  const [tenantStages, setTenantStages] = useState<{ key: string; label: string }[]>([])

  const assignedTo = searchParams.get('assignedTo') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const page = searchParams.get('page') ?? '1'
  const pageSizeParam = searchParams.get('pageSize') ?? '10'
  const tagsParam = searchParams.get('tags') ?? undefined
  const stageFilter = searchParams.get('stage') ?? undefined
  const subStatusTypeFilter = searchParams.get('subStatusType') ?? undefined
  const subStatusIdFilter = searchParams.get('subStatusId') ?? undefined
  const closedActionFilter = searchParams.get('closedAction') ?? undefined
  const appUniversityNameFilter = searchParams.get('appUniversityName') ?? undefined
  const appCourseNameFilter = searchParams.get('appCourseName') ?? undefined
  const appSourceFilter = searchParams.get('appSource') ?? undefined
  const appStatusFilter = searchParams.get('appStatus') ?? undefined
  const appIntakeMonthFilter = searchParams.get('appIntakeMonth') ?? undefined
  const appIntakeYearFilter = searchParams.get('appIntakeYear') ?? undefined
  const leadIntakeMonthFilter = searchParams.get('leadIntakeMonth') ?? undefined
  const leadIntakeYearFilter = searchParams.get('leadIntakeYear') ?? undefined
  const revIntakeMonthFilter = searchParams.get('revIntakeMonth') ?? undefined
  const revIntakeYearFilter = searchParams.get('revIntakeYear') ?? undefined

  const currentPage = Math.max(1, Number(page) || 1)
  const pageSize = Number(pageSizeParam) || 10
  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize))

  useEffect(() => {
    fetch('/api/pipeline-stages')
      .then((r) => r.json())
      .then((data) => {
        const rows = data?.data?.stages ?? []
        setTenantStages(rows.map((s: { key: string; label: string }) => ({ key: s.key, label: s.label })))
      })
      .catch(() => {})
  }, [])

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
      if (subStatusIdFilter) params.set('subStatusId', subStatusIdFilter)
      if (closedActionFilter) params.set('closedAction', closedActionFilter)
      if (appUniversityNameFilter) params.set('appUniversityName', appUniversityNameFilter)
      if (appCourseNameFilter) params.set('appCourseName', appCourseNameFilter)
      if (appSourceFilter) params.set('appSource', appSourceFilter)
      if (appStatusFilter) params.set('appStatus', appStatusFilter)
      if (appIntakeMonthFilter) params.set('appIntakeMonth', appIntakeMonthFilter)
      if (appIntakeYearFilter) params.set('appIntakeYear', appIntakeYearFilter)
      if (leadIntakeMonthFilter) params.set('leadIntakeMonth', leadIntakeMonthFilter)
      if (leadIntakeYearFilter) params.set('leadIntakeYear', leadIntakeYearFilter)
      if (revIntakeMonthFilter) params.set('revIntakeMonth', revIntakeMonthFilter)
      if (revIntakeYearFilter) params.set('revIntakeYear', revIntakeYearFilter)
      params.set('_t', Date.now().toString())

      const [leadsRes, agentsRes] = await Promise.all([
        fetch(`/api/leads?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/admin/team-members', { cache: 'no-store' }),
      ])
      const leadsData = await leadsRes.json()
      const agentsData = await agentsRes.json()

      if (!leadsRes.ok) throw new Error(leadsData.error ?? 'Failed to load leads')
      if (!agentsRes.ok) throw new Error(agentsData.error ?? 'Failed to load agents')

      setLeads(leadsData.data?.leads ?? [])
      setTotalLeads(Number(leadsData.data?.total ?? 0))
      setAgents(agentsData.data?.members ?? [])
      setSelectedIds(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [
    assignedTo, currentPage, pageSize, q, stageFilter, subStatusIdFilter, closedActionFilter, tagsParam,
    appUniversityNameFilter, appCourseNameFilter, appSourceFilter, appStatusFilter, appIntakeMonthFilter, appIntakeYearFilter,
    leadIntakeMonthFilter, leadIntakeYearFilter, revIntakeMonthFilter, revIntakeYearFilter,
  ])

  useEffect(() => {
    const timer = setTimeout(() => { void fetchData() }, FETCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [fetchData])

  const filteredLeads = useMemo(() => (
    heatFilter === 'all'
      ? leads
      : leads.filter((lead) => getHeatLevel(
          lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
          new Date(lead.createdAt),
          lead.isDeadManual,
        ) === heatFilter)
  ), [leads, heatFilter])

  const selectedCount = selectedIds.size

  const stageInfoMap = useMemo(() => {
    const map = new Map<string, { label: string; badgeClasses: string }>()
    for (const s of PIPELINE_STAGES) {
      map.set(s.value, { label: s.label, badgeClasses: s.badgeClasses })
    }
    for (const s of tenantStages) {
      const existing = map.get(s.key)
      map.set(s.key, {
        label: s.label,
        badgeClasses: existing?.badgeClasses ?? 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm',
      })
    }
    return map
  }, [tenantStages])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()
    agents.forEach((agent) => map.set(agent.userId, agent.name))
    return map
  }, [agents])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (stageFilter) count++
    if (subStatusIdFilter) count++
    if (closedActionFilter) count++
    if (heatFilter !== 'all') count++
    if (assignedTo) count++
    if (tagsParam) count++
    if (appUniversityNameFilter || appCourseNameFilter || appSourceFilter || appStatusFilter) count++
    if (leadIntakeMonthFilter || leadIntakeYearFilter) count++
    if (revIntakeMonthFilter || revIntakeYearFilter) count++
    return count
  }, [
    stageFilter, subStatusIdFilter, closedActionFilter, heatFilter, assignedTo, tagsParam,
    appUniversityNameFilter, appCourseNameFilter, appSourceFilter, appStatusFilter,
    leadIntakeMonthFilter, leadIntakeYearFilter, revIntakeMonthFilter, revIntakeYearFilter,
  ])

  const handleToggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredLeads.map((l) => l.id)) : new Set())
  }, [filteredLeads])

  const handleBulkAssign = async (newAssignedTo: string) => {
    setBulkActionLoading(true)
    const count = selectedIds.size
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), assignedTo: newAssignedTo, tenantSlug }),
      })
      return res.json()
    }, { successMsg: `Assigned ${count} leads`, errorMsg: 'Failed to assign leads' })
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
        body: JSON.stringify({ leadIds: Array.from(selectedIds), stage, tenantSlug }),
      })
      return res.json()
    }, { successMsg: `Moved ${count} leads to ${stage}`, errorMsg: 'Failed to update stage' })
    if (data) {
      setSelectedIds(new Set())
      await fetchData()
      router.refresh()
    }
    setBulkActionLoading(false)
  }

  const downloadCsv = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkExport = async () => {
    setBulkActionLoading(true)
    await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), tenantSlug }),
      })
      if (!res.ok) throw new Error('Export failed')
      downloadCsv(await res.blob())
      return true
    }, { successMsg: 'Export downloaded', errorMsg: 'Failed to export leads' })
    setBulkActionLoading(false)
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const count = selectedIds.size
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), tenantSlug }),
      })
      return res.json()
    }, { successMsg: `Deleted ${count} leads`, errorMsg: 'Failed to delete leads' })
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
      if (!leadIds || leadIds.length === 0) throw new Error('No leads matching the current filters were found.')

      const res = await fetch('/api/leads/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, tenantSlug }),
      })
      if (!res.ok) throw new Error('Export generation failed')
      downloadCsv(await res.blob())
      return true
    }, { successMsg: 'Export started', errorMsg: 'Failed to export leads' })
    setBulkActionLoading(false)
  }

  const leadDetailPath = (id: string) => tenantPath(tenantSlug, `/${role.toLowerCase()}/leads/${id}`)

  return (
    <div className="p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Leads' : 'My Leads'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalLeads} total records</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <SearchInput
              placeholder="Search leads..."
              className="text-black w-full h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <FilterSheet
            tenantStages={tenantStages}
            agents={agents}
            isAdmin={isAdmin}
            heatFilter={heatFilter}
            onHeatFilterChange={setHeatFilter}
            activeFilterCount={activeFilterCount}
          />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-2 text-sm">
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium hover:text-[#0DA2E7] dark:hover:text-white">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1 rounded-lg shadow-crm-md border-slate-200 dark:border-slate-700">
                <DropdownMenuItem
                  onClick={handleExportAll}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <span>Export All CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm">
                  <Link href={tenantPath(tenantSlug, '/admin/import')}>
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span>Import Leads</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {(isAdmin || canCreate) && <CreateLeadDialog tenantSlug={tenantSlug} showPaymentFields={role === 'ADMIN' || canEditPayments} />}
        </div>
      </div>

      {selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selectedCount}
          isAdmin={isAdmin}
          canDelete={canDelete}
          agents={agents}
          bulkActionLoading={bulkActionLoading}
          onAssign={handleBulkAssign}
          onMoveStage={handleBulkStage}
          onExport={handleBulkExport}
          onDeleteClick={() => setShowBulkDeleteDialog(true)}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {!loading && !error && filteredLeads.length === 0 && leads.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500">
          No leads match this active filter.
        </div>
      ) : (
        <LeadsTable
          leads={filteredLeads}
          loading={loading}
          error={error}
          totalLeads={totalLeads}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          stageInfoMap={stageInfoMap}
          assigneeNameById={assigneeNameById}
          onRowClick={(id) => router.push(leadDetailPath(id))}
        />
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
                  if (subStatusTypeFilter) sp.set('subStatusType', subStatusTypeFilter)
                  if (subStatusIdFilter) sp.set('subStatusId', subStatusIdFilter)
                  if (closedActionFilter) sp.set('closedAction', closedActionFilter)
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
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Delete ${selectedIds.size} leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}