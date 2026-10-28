'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Check, Loader2, Megaphone, RefreshCw, Users } from 'lucide-react'

import Pagination from '@/components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { apiCall } from '@/lib/utils/api-handler'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type MetaLead = {
  id: string
  displayId: string | null
  fullName: string
  contactNumber: string | null
  email: string | null
  destinationCountry: string | null
  campaign: string | null
  createdAt: string | null
  assignedTo: string | null
  assignedToName: string | null
  reassignedFrom: string | null
  primaryStage: string
}

type Member = {
  userId: string
  name: string
  email: string
  role: 'ADMIN' | 'PRO'
}

type Settings = {
  connected: boolean
  pageName: string | null
  autoAssign: boolean
  defaultAssigneeId: string | null
  defaultAssigneeName: string | null
}

type ListResult = {
  leads: MetaLead[]
  total: number
  stats: { today: number; unassigned: number; assigned: number }
  campaigns: string[]
}

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return fallback
}

function getApiData<T>(body: unknown): T | null {
  if (!body || typeof body !== 'object' || !('data' in body)) return null
  return body.data as T
}

function stageLabel(stage: string, stageLabels: Record<string, string>) {
  return stageLabels[stage] ?? PIPELINE_STAGES.find((item) => item.value === stage)?.label
    ?? stage.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function relativeTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : formatDistanceToNow(date, { addSuffix: true })
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string
  value: number
  icon: React.ReactNode
  tone: string
}) {
  return (
    <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0f172a]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>{icon}</div>
      </CardContent>
    </Card>
  )
}

export default function MetaLeadsClient({
  tenantSlug,
  stageLabels,
}: {
  tenantSlug: string
  stageLabels: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const filterAssigned = searchParams.get('assigned') ?? 'all'
  const filterCampaign = searchParams.get('campaign') ?? ''
  const filterQ = searchParams.get('q') ?? ''
  const filterFrom = searchParams.get('from') ?? ''
  const filterTo = searchParams.get('to') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 25))

  const [searchValue, setSearchValue] = useState(filterQ)
  const [list, setList] = useState<ListResult | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)
  const [draftAutoAssign, setDraftAutoAssign] = useState(false)
  const [draftAssigneeId, setDraftAssigneeId] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssigneeId, setBulkAssigneeId] = useState('')
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    setSearchValue(filterQ)
  }, [filterQ])

  const changeQuery = useCallback((updates: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if ('q' in updates || 'assigned' in updates || 'campaign' in updates || 'from' in updates || 'to' in updates) {
      params.delete('page')
    }
    const next = params.toString()
    const href = next ? `${pathname}?${next}` : pathname
    if (replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (searchValue === filterQ) return
    const timer = setTimeout(() => {
      changeQuery({ q: searchValue || null }, true)
    }, 300)
    return () => clearTimeout(timer)
  }, [changeQuery, filterQ, searchValue])

  const fetchList = useCallback(async (signal?: AbortSignal) => {
    const currentRequestId = ++requestId.current
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams(queryString)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const response = await fetch(`/api/meta-leads?${params.toString()}`, {
        cache: 'no-store',
        signal,
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(body, 'Failed to load Meta leads'))
      const data = getApiData<ListResult>(body)
      if (!data) throw new Error('The Meta leads response was invalid')
      if (currentRequestId !== requestId.current) return
      setList(data)
      setSelectedIds(new Set())
    } catch (error) {
      if (signal?.aborted || currentRequestId !== requestId.current) return
      setListError(error instanceof Error ? error.message : 'Failed to load Meta leads')
    } finally {
      if (!signal?.aborted && currentRequestId === requestId.current) setListLoading(false)
    }
  }, [page, pageSize, queryString])

  useEffect(() => {
    const controller = new AbortController()
    void fetchList(controller.signal)
    return () => controller.abort()
  }, [fetchList])

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    setSettingsError(null)
    setMembersError(null)
    try {
      const [settingsResponse, membersResponse] = await Promise.all([
        fetch('/api/meta-leads/settings', { cache: 'no-store' }),
        fetch('/api/admin/team-members', { cache: 'no-store' }),
      ])
      const [settingsBody, membersBody]: [unknown, unknown] = await Promise.all([
        settingsResponse.json(),
        membersResponse.json(),
      ])
      if (!settingsResponse.ok) {
        throw new Error(getErrorMessage(settingsBody, 'Failed to load Meta settings'))
      }
      if (!membersResponse.ok) {
        setMembersError(getErrorMessage(membersBody, 'Failed to load tenant members'))
      } else {
        const memberData = getApiData<{ members: Member[] }>(membersBody)
        if (!memberData) setMembersError('The tenant members response was invalid')
        else setMembers(memberData.members ?? [])
      }

      const data = getApiData<Settings>(settingsBody)
      if (!data) throw new Error('The Meta settings response was invalid')
      setSettings(data)
      setDraftAutoAssign(data.autoAssign)
      setDraftAssigneeId(data.defaultAssigneeId ?? '')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Failed to load Meta settings')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const saveSettings = async () => {
    if (!settings?.connected) return
    if (draftAutoAssign && !draftAssigneeId) {
      toast.error('Choose a default counsellor before enabling auto-assign')
      return
    }

    setSavingSettings(true)
    const result = await apiCall(async () => {
      const response = await fetch('/api/meta-leads/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoAssign: draftAutoAssign,
          defaultAssigneeId: draftAssigneeId || null,
        }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(body, 'Failed to save Meta settings'))
      return true
    }, { successMsg: 'Meta lead settings saved', errorMsg: 'Failed to save Meta settings' })
    if (result) {
      setSettings((current) => current
        ? {
            ...current,
            autoAssign: draftAutoAssign,
            defaultAssigneeId: draftAssigneeId || null,
            defaultAssigneeName: members.find((member) => member.userId === draftAssigneeId)?.name ?? null,
          }
        : current)
    }
    setSavingSettings(false)
  }

  const assignOne = async (leadId: string, assignedTo: string) => {
    const result = await apiCall(async () => {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(body, 'Failed to assign lead'))
      return true
    }, { successMsg: 'Lead assigned', errorMsg: 'Failed to assign lead' })
    if (result) {
      await fetchList()
      router.refresh()
    }
  }

  const assignSelected = async () => {
    if (!bulkAssigneeId || selectedIds.size === 0) return
    setBulkAssigning(true)
    const selectedCount = selectedIds.size
    const result = await apiCall(async () => {
      const response = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedIds),
          assignedTo: bulkAssigneeId,
          tenantSlug,
        }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(body, 'Failed to assign selected leads'))
      const data = getApiData<{ updated: number }>(body)
      if (!data) throw new Error('The assignment response was invalid')
      return data
    }, { successMsg: `Assigned ${selectedCount} leads`, errorMsg: 'Failed to assign selected leads' })
    if (result) {
      setSelectedIds(new Set())
      setBulkAssigneeId('')
      await fetchList()
      router.refresh()
    }
    setBulkAssigning(false)
  }

  const toggleLead = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    const pageLeads = list?.leads ?? []
    setSelectedIds(checked ? new Set(pageLeads.map((lead) => lead.id)) : new Set())
  }

  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / pageSize))
  const allSelected = Boolean(list?.leads.length && list.leads.every((lead) => selectedIds.has(lead.id)))
  const someSelected = Boolean(list?.leads.some((lead) => selectedIds.has(lead.id)))
  const settingsChanged = Boolean(
    settings &&
    (draftAutoAssign !== settings.autoAssign ||
      draftAssigneeId !== (settings.defaultAssigneeId ?? '')),
  )
  const campaignOptions = useMemo(() => list?.campaigns ?? [], [list?.campaigns])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Meta Leads</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and assign leads received from Meta Lead Ads.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchList()} disabled={listLoading}>
          <RefreshCw className={cn('h-4 w-4', listLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Meta lead stats">
        <MetricCard title="Received today" value={list?.stats.today ?? 0} icon={<Megaphone className="h-5 w-5" />} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <MetricCard title="Unassigned" value={list?.stats.unassigned ?? 0} icon={<AlertCircle className="h-5 w-5" />} tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
        <MetricCard title="Assigned" value={list?.stats.assigned ?? 0} icon={<Check className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
      </section>

      <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0f172a]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meta lead settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
          ) : settingsError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <span>{settingsError}</span>
              <Button variant="outline" size="sm" onClick={() => void fetchSettings()}>Retry</Button>
            </div>
          ) : settings && !settings.connected ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              No Meta Page is connected to this workspace yet. Connect a Meta Page to configure lead assignment.
            </div>
          ) : settings ? (
            <>
              {settings.pageName && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Connected Page: <span className="font-medium text-slate-700 dark:text-slate-200">{settings.pageName}</span>
                </p>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label htmlFor="meta-auto-assign" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Auto-assign new Meta leads
                  </label>
                  <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">
                    When OFF, every Meta lead waits here for an admin to assign it.
                  </p>
                </div>
                <Switch
                  id="meta-auto-assign"
                  checked={draftAutoAssign}
                  onCheckedChange={setDraftAutoAssign}
                  disabled={savingSettings}
                  aria-label="Auto-assign new Meta leads"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-1.5">
                  <label htmlFor="meta-default-assignee" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Default counsellor
                  </label>
                  <Select
                    value={draftAssigneeId || 'none'}
                    onValueChange={(value) => setDraftAssigneeId(value === 'none' ? '' : value)}
                    disabled={savingSettings || Boolean(membersError)}
                  >
                    <SelectTrigger id="meta-default-assignee">
                      <SelectValue placeholder="Choose a counsellor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default counsellor</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name} {member.role === 'ADMIN' ? '(Admin)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {membersError && <p className="text-xs text-red-600">{membersError}</p>}
                  {!membersError && members.length === 0 && (
                    <p className="text-xs text-slate-500">No active tenant members were found.</p>
                  )}
                  {draftAutoAssign && !draftAssigneeId && (
                    <p className="text-xs text-amber-700">Select a default counsellor to enable auto-assign.</p>
                  )}
                </div>
                <Button
                  onClick={() => void saveSettings()}
                  disabled={!settings.connected || !settingsChanged || savingSettings || Boolean(membersError)}
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save settings'}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={filterAssigned} onValueChange={(value) => changeQuery({ assigned: value === 'all' ? null : value })}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Assignment filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignments</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCampaign ? `campaign:${filterCampaign}` : 'all'} onValueChange={(value) => changeQuery({ campaign: value === 'all' ? null : value.slice('campaign:'.length) })}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Campaign filter">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {campaignOptions.map((campaign) => (
                  <SelectItem key={campaign} value={`campaign:${campaign}`}>{campaign}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search name, phone, or email"
              className="w-full sm:max-w-xs"
              aria-label="Search Meta leads"
            />
            <Input
              type="date"
              value={filterFrom}
              onChange={(event) => changeQuery({ from: event.target.value || null })}
              aria-label="From date"
              className="w-full sm:w-auto"
            />
            <Input
              type="date"
              value={filterTo}
              onChange={(event) => changeQuery({ to: event.target.value || null })}
              aria-label="To date"
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedIds.size} selected
            </span>
            <Select value={bulkAssigneeId} onValueChange={setBulkAssigneeId}>
              <SelectTrigger className="w-full bg-white sm:w-64" aria-label="Select counsellor for bulk assignment">
                <SelectValue placeholder="Choose counsellor" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name} {member.role === 'ADMIN' ? '(Admin)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void assignSelected()} disabled={!bulkAssigneeId || bulkAssigning || Boolean(membersError)}>
              {bulkAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign selected'}
            </Button>
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={bulkAssigning}>
              Clear selection
            </Button>
          </div>
        )}

        {listError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-white py-14 text-center dark:border-red-900 dark:bg-[#0f172a]">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{listError}</p>
            <Button variant="outline" onClick={() => void fetchList()}>Retry loading leads</Button>
          </div>
        ) : listLoading && !list ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#0f172a]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading Meta leads…
          </div>
        ) : list?.leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-[#0f172a]">
            <Users className="h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {!settings?.connected
                ? 'No Meta connection yet'
                : list.total === 0
                  ? 'No Meta leads yet'
                  : 'No leads match these filters'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {!settings?.connected
                ? 'Connect a Meta Page to start receiving leads.'
                : list.total === 0
                  ? 'New leads from connected Meta Pages will appear here.'
                  : 'Try changing or clearing the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#0f172a]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <tr>
                    <th className="w-10 px-3 py-3 text-left">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                        aria-label="Select all Meta leads on this page"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </th>
                    {['Lead ID', 'Name', 'Phone', 'Email', 'Campaign', 'Received', 'Assigned to', 'Stage', ''].map((heading) => (
                      <th key={heading || 'action'} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list?.leads.map((lead) => (
                    <MetaLeadTableRow
                      key={`${lead.id}-${lead.assignedTo ?? 'unassigned'}`}
                      lead={lead}
                      stageLabels={stageLabels}
                      selected={selectedIds.has(lead.id)}
                      members={members}
                      onToggle={toggleLead}
                      onOpen={() => router.push(`/t/${tenantSlug}/admin/leads/${lead.id}`)}
                      onAssign={(assigneeId) => assignOne(lead.id, assigneeId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {list && list.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              {list.total} Meta lead{list.total === 1 ? '' : 's'}
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              makeHref={(nextPage) => {
                const params = new URLSearchParams(queryString)
                params.set('page', String(nextPage))
                if (pageSize !== 25) params.set('pageSize', String(pageSize))
                else params.delete('pageSize')
                return `${pathname}?${params.toString()}`
              }}
            />
            <Select value={String(pageSize)} onValueChange={(value) => changeQuery({ pageSize: value === '25' ? null : value, page: null })}>
              <SelectTrigger className="w-32" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>
    </div>
  )
}

function MetaLeadTableRow({
  lead,
  stageLabels,
  selected,
  members,
  onToggle,
  onOpen,
  onAssign,
}: {
  lead: MetaLead
  stageLabels: Record<string, string>
  selected: boolean
  members: Member[]
  onToggle: (id: string, checked: boolean) => void
  onOpen: () => void
  onAssign: (assigneeId: string) => Promise<void>
}) {
  const [assigneeId, setAssigneeId] = useState(lead.assignedTo ?? '')
  const [saving, setSaving] = useState(false)

  const assign = async () => {
    if (!assigneeId || assigneeId === lead.assignedTo) return
    setSaving(true)
    try {
      await onAssign(assigneeId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr
      onClick={onOpen}
      className={cn(
        'cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40',
        selected && 'bg-blue-50/70 dark:bg-blue-950/20',
      )}
    >
      <td className="px-3 py-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggle(lead.id, Boolean(checked))}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${lead.fullName}`}
        />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{lead.displayId ?? lead.id.slice(0, 8)}</td>
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{lead.fullName}</td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.contactNumber ?? '—'}</td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.email ?? '—'}</td>
      <td className="max-w-56 truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={lead.campaign ?? undefined}>
        {lead.campaign ?? '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300" title={lead.createdAt ? new Date(lead.createdAt).toLocaleString() : undefined}>
        {relativeTime(lead.createdAt)}
      </td>
      <td className="px-4 py-3">
        {lead.assignedTo ? (
          <span className="text-slate-700 dark:text-slate-200">{lead.assignedToName ?? 'Unknown'}</span>
        ) : (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Unassigned
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{stageLabel(lead.primaryStage, stageLabels)}</Badge>
      </td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Select value={assigneeId || 'none'} onValueChange={(value) => setAssigneeId(value === 'none' ? '' : value)}>
            <SelectTrigger className="h-8 w-36" aria-label={`Choose assignee for ${lead.fullName}`}>
              <SelectValue placeholder="Choose member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose member</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8"
            disabled={!assigneeId || assigneeId === lead.assignedTo || saving}
            onClick={() => void assign()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lead.assignedTo ? 'Save' : 'Assign'}
          </Button>
        </div>
      </td>
    </tr>
  )
}
