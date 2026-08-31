'use client';

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { DollarSign, Loader2, Check, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Lead } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { TagSelector } from '@/components/leads/TagSelector'
import { CURRENCIES } from '@/constants/lead-options'
import { LeadReminders } from '@/components/leads/LeadReminders'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import type { ActivityRow, UserRow } from '@/types/leads'
import { tenantPath } from '@/lib/tenant-path'
import { getHeatLevel, heatConfig } from '@/lib/leads/heat'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadDocumentsPanel } from '@/components/leads/LeadDocumentsPanel'
import { apiCall } from '@/lib/utils/api-handler'
import { WhatsappLogger } from '@/components/leads/WhatsappLogger'
import { LeadDeleteButton } from '@/components/leads/LeadDeleteButton'
import { LeadRevenueCard } from '@/components/leads/LeadRevenueCard'
import { ApplicationTab } from '@/components/leads/ApplicationTab'
import SubStatusCustomFieldsForm from '@/components/leads/SubStatusCustomFieldsForm'
import {
  areCustomFieldsComplete,
  normalizeCustomFields,
  normalizeFieldValues,
} from '@/lib/pipeline/sub-status-fields'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getIntakeYears(): number[] {
  const cur = new Date().getFullYear()
  const years: number[] = []
  for (let y = cur - 1; y <= cur + 10; y++) years.push(y)
  return years
}

export default function LeadDetailClient({
  lead,
  activities: initialActivities,
  allUsers,
  tags,
  activeStages: activeStagesProp,
}: {
  lead: Lead
  activities: ActivityRow[]
  allUsers: UserRow[]
  tags: { id: string; name: string; color: string }[]
  activeStages: string[]
}) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')
  // URL‑driven tab state (persist across refresh / deep‑link)
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab') ?? 'overview'

  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams?.toString())
    newParams.set('tab', tab)
    router.replace(`?${newParams.toString()}`)
  }

  const [primaryStage, setPrimaryStage] = useState<string>(
    lead.primaryStage ?? lead.stage ?? 'new_lead',
  )
  const [activeStages, setActiveStages] = useState<string[]>(
    activeStagesProp?.length ? activeStagesProp : [(lead.primaryStage ?? lead.stage ?? 'new_lead')]
  )
  const [pipelineStages, setPipelineStages] = useState<Array<{ key: string; label: string }>>([])
  const [stagesLoading, setStagesLoading] = useState(true)
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [selectedAssignee, setSelectedAssignee] = useState(lead.assignedTo ?? '')
  const [savingAssignee, setSavingAssignee] = useState(false)
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [editingLead, setEditingLead] = useState(false)
  const [subStatuses, setSubStatuses] = useState<any[]>([])
  const [selectedSubStatusId, setSelectedSubStatusId] = useState<string | null>(lead.subStatusId ?? null)
  const [selectedClosedAction, setSelectedClosedAction] = useState<string | null>(lead.closedAction ?? null)
  const [subStatusFieldValues, setSubStatusFieldValues] = useState<Record<string, string>>(
    () => normalizeFieldValues(lead.subStatusFieldValues),
  )
  const [savingSubStatus, setSavingSubStatus] = useState(false)
  // NEW – dead‑status UI state
  const [isDeadState, setIsDeadState] = useState<boolean>(lead.isDeadManual ?? false)
  const [isDead, setIsDead] = useState<boolean>(lead.isDeadManual ?? false)
  const [deadReason, setDeadReason] = useState<string>(lead.deadReason ?? '')
  const [savingDead, setSavingDead] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: lead.fullName ?? '',
    email: lead.email ?? '',
    contactNumber: lead.contactNumber ?? '',
    city: lead.city ?? '',
    country: lead.country ?? DEFAULT_LEAD_COUNTRY,
    lastQualification: lead.lastQualification ?? '',
    grades: lead.grades ?? '',
    intakeMonth: lead.intakeMonth ? String(lead.intakeMonth) : '',
    intakeYear: lead.intakeYear ? String(lead.intakeYear) : '',
    destinationCountry: lead.destinationCountry ?? '',
    programOfInterest: lead.programOfInterest ?? '',
    dealValue: lead.dealValue ?? '',
    dealCurrency: lead.dealCurrency ?? 'USD',
  })

  const intakeYears = getIntakeYears()

  const [logType, setLogType] = useState<'note' | 'call' | 'message'>('note')
  const [logBody, setLogBody] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logSaved, setLogSaved] = useState(false)
  const [logError, setLogError] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const proUsers = allUsers

  const stageLabelByKey = useMemo(() => {
    const entries = pipelineStages.map((s) => [s.key, s.label] as const)
    return Object.fromEntries(entries) as Record<string, string>
  }, [pipelineStages])

  const styleByKey = useMemo(() => {
    const entries = PIPELINE_STAGES.map((s) => [
      s.value,
      { mutedClasses: s.mutedClasses, label: s.label },
    ] as const)
    return Object.fromEntries(entries) as Record<string, { mutedClasses: string; label: string }>
  }, [])

  const stageBadge = useMemo(() => {
    const fallback = styleByKey[primaryStage] ?? styleByKey['new_lead']
    return {
      mutedClasses: fallback?.mutedClasses ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      label: stageLabelByKey[primaryStage] ?? fallback?.label ?? primaryStage,
    }
  }, [primaryStage, stageLabelByKey, styleByKey])

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch('/api/pipeline-stages')
        const data = await res.json()
        const rows = (data?.data?.stages ?? data?.stages ?? []) as Array<{ key: string; label: string }>
        setPipelineStages(rows)
      } catch {
        // If this fails, we still allow fallback single-stage behavior.
      } finally {
        setStagesLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    setIsDead(lead.isDeadManual ?? false)
    setDeadReason(lead.deadReason ?? '')
  }, [lead.isDeadManual, lead.deadReason])

  useEffect(() => {
    setAssignedTo(lead.assignedTo ?? '')
    setSelectedAssignee(lead.assignedTo ?? '')
  }, [lead.assignedTo])

  const fetchSubStatuses = async (stageKey: string) => {
    try {
      const res = await fetch(`/api/sub-statuses?stageKey=${stageKey}`)
      const data = await res.json()
      setSubStatuses(Array.isArray(data) ? data : [])
    } catch { setSubStatuses([]) }
  }

  useEffect(() => { fetchSubStatuses(primaryStage) }, [primaryStage])

  const selectedSubStatus = subStatuses.find((ss) => ss.id === selectedSubStatusId)
  const activeCustomFields =
    selectedSubStatus?.customFieldsEnabled
      ? normalizeCustomFields(selectedSubStatus.customFields)
      : []
  const closedActions = (selectedSubStatus?.closedActions as string[]) ?? []
  const needsClosedAction = closedActions.length > 0
  const needsCustomFields = activeCustomFields.length > 0
  const customFieldsComplete = !needsCustomFields || areCustomFieldsComplete(activeCustomFields, subStatusFieldValues)
  const canSaveSubStatus =
    Boolean(selectedSubStatusId) &&
    (!needsClosedAction || Boolean(selectedClosedAction)) &&
    customFieldsComplete

  const handleSubStatusFieldChange = (key: string, value: string) => {
    setSubStatusFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubStatusSave = async () => {
    if (!canSaveSubStatus) return
    setSavingSubStatus(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subStatusId: selectedSubStatusId,
          closedAction: selectedClosedAction,
          subStatusFieldValues: needsCustomFields ? subStatusFieldValues : {},
        }),
      })
      return res.json()
    }, { successMsg: 'Status updated', errorMsg: 'Failed to update status' })
    setSavingSubStatus(false)
    if (data) router.refresh()
  }

  async function persistStages(nextPrimary: string, nextActive: string[]) {
    setSaving(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryStage: nextPrimary, activeStages: nextActive }),
      })
      return res.json()
    }, { successMsg: 'Lead stages updated', errorMsg: 'Stage update failed' })
    setSaving(false)
    if (!data) return false
    router.refresh()
    return true
  }

  async function handleStageToggle(stageKey: string) {
    if (stageKey === primaryStage) return
    const prevPrimary = primaryStage
    const prevActive = activeStages
    setPrimaryStage(stageKey)
    setActiveStages([stageKey])
    const ok = await persistStages(stageKey, [stageKey])
    if (!ok) {
      setPrimaryStage(prevPrimary)
      setActiveStages(prevActive)
    }
  }

  const handleSaveAssign = async () => {
    if (selectedAssignee === assignedTo) return
    setSavingAssignee(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: selectedAssignee || null }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not assign lead')
      return res.json()
    }, { successMsg: 'Lead assigned', errorMsg: 'Could not assign lead' })
    setSavingAssignee(false)
    if (!data) {
      setSelectedAssignee(assignedTo)
      return
    }
    setAssignedTo(selectedAssignee)
    router.refresh()
  }

  async function handleAddNote() {
    if (!note.trim()) return
    setAddingNote(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, type: noteType }),
      })
      return res.json()
    }, { successMsg: 'Activity added', errorMsg: 'Failed to add activity' })
    setAddingNote(false)
    if (!data) return
    setNote('')
    router.refresh()
  }

  async function handleSaveLeadProfile() {
    setEditingLead(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          intakeMonth: profileForm.intakeMonth ? parseInt(profileForm.intakeMonth, 10) : null,
          intakeYear: profileForm.intakeYear ? parseInt(profileForm.intakeYear, 10) : null,
          destinationCountry: profileForm.destinationCountry?.trim() || null,
          programOfInterest: profileForm.programOfInterest?.trim() || null,
          dealValue: profileForm.dealValue === '' ? null : Number(profileForm.dealValue),
        }),
      })
      return res.json()
    }, { successMsg: 'Lead updated', errorMsg: 'Could not update lead profile' })
    setEditingLead(false)
    if (!data) return
    router.refresh()
  }

  async function handleMarkDead() {
    setSavingDead(true)
    const payloadIsDead = isDeadState ? false : isDead;
    const payloadReason = payloadIsDead ? deadReason : null;

    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeadManual: payloadIsDead, deadReason: payloadReason }),
      })
      return res.json()
    }, { successMsg: payloadIsDead ? 'Lead marked as dead' : 'Lead reopened', errorMsg: 'Status update failed' })
    setSavingDead(false)
    if (data) {
      setIsDeadState(payloadIsDead);
      setIsDead(payloadIsDead);
      if (!payloadIsDead) setDeadReason('');
      router.refresh()
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/logs?leadId=${lead.id}`)
      const data = await res.json()
      setLogs(data ?? [])
    } catch { setLogs([]) }
    finally { setLogsLoading(false) }
  }

  const handleSaveLog = async () => {
    if (!logBody.trim() || logSaving) return
    setLogSaving(true)
    setLogError(false)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, type: logType, body: logBody })
      })
      if (res.ok) {
        setLogBody('')
        setLogSaved(true)
        setTimeout(() => setLogSaved(false), 2000)
        fetchLogs()
      } else { setLogError(true) }
    } catch { setLogError(true) }
    finally { setLogSaving(false) }
  }

  useEffect(() => { fetchLogs() }, [lead.id])

  const heat = getHeatLevel(
    lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
    lead.createdAt ? new Date(lead.createdAt) : new Date(),
    isDeadState
  )

  return (<TooltipProvider>
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={
              tenantSlug ? tenantPath(tenantSlug, '/admin/leads') : '/admin/leads'
            }
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            ← Back to Leads
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4">
            <h1 className="min-w-0 break-words text-2xl font-semibold text-slate-900 dark:text-white">
              {lead.fullName}
            </h1>
            {lead.dealValue && (
              <div className="flex items-center gap-1.5 text-sm font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{lead.dealCurrency} {Number(lead.dealValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>

          {/* NEW – Student ID */}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Student ID:</span>
            <span className="text-xs font-mono text-muted-foreground" title={lead.id}>
              {lead.id.slice(0, 7)}...
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lead.id)
                setCopiedId(true)
                setTimeout(() => setCopiedId(false), 2000)
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="Copy full Student ID"
            >
              {copiedId ? (
                <span className="flex items-center text-green-500">
                  <Check className="w-3 h-3 mr-0.5" /> Copied
                </span>
              ) : (
                'Copy'
              )}
            </button>
          </div>

          <div className="mt-4">
            <TagSelector leadId={lead.id} initialTags={tags} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-md border px-2 py-1 text-xs ${stageBadge.mutedClasses}`}>
              {stageBadge.label}
            </span>
            {/* NEW – dead badge */}
            {isDead && (
              <span className="ml-2 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 text-xs">
                Dead
              </span>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
                    'text-xs font-medium border',
                    heatConfig[heat].bg,
                    heatConfig[heat].color,
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      heat === 'dead' && 'animate-pulse',
                      heatConfig[heat].dot,
                    )}
                  />
                  {heatConfig[heat].label}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {lead.lastContactedAt
                  ? `Last contacted ${formatDistanceToNow(new Date(lead.lastContactedAt))} ago`
                  : `No contact recorded yet — created ${formatDistanceToNow(
                    lead.createdAt ? new Date(lead.createdAt) : new Date(),
                  )} ago`}
              </TooltipContent>
            </Tooltip>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>

      {isDeadState && (
        <div className="mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 text-center">
          This lead is marked as dead. Reopen it to make changes.
        </div>
      )}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="mb-6 inline-flex w-auto sticky top-[60px] z-10 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 pb-0">
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')}>Overview</TabsTrigger>
          <TabsTrigger value="application" onClick={() => setActiveTab('application')}>Application</TabsTrigger>
          <TabsTrigger value="documents" onClick={() => setActiveTab('documents')}>Documents</TabsTrigger>
          <TabsTrigger value="pipeline" onClick={() => setActiveTab('pipeline')}>Pipeline</TabsTrigger>
          <TabsTrigger value="activity" onClick={() => setActiveTab('activity')}>Activity</TabsTrigger>
          <TabsTrigger value="reminders" onClick={() => setActiveTab('reminders')}>Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp" onClick={() => setActiveTab('whatsapp')}>WhatsApp</TabsTrigger>
        </TabsList>

        {/* ==== Documents ==== */}
        <TabsContent value="documents" className="outline-none">
          <LeadDocumentsPanel leadId={lead.id} />
        </TabsContent>

        {/* ==== Overview ==== (kept) */}
        <TabsContent value="overview" className="outline-none">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left side – Journey + Contact + Edit fields */}
            <div className="space-y-6 md:col-span-2">
              {/* Contact Info card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact Info</h2>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  {[
                    { label: 'Email', value: lead.email },
                    { label: 'Phone', value: lead.contactNumber },
                    { label: 'City', value: lead.city },
                    { label: 'Country', value: lead.country },
                    { label: 'Qualification', value: lead.lastQualification },
                    { label: 'Grades', value: lead.grades },
                    { label: 'Source', value: lead.source },
                    {
                      label: 'Deal Value',
                      value: lead.dealValue ? `${lead.dealCurrency} ${Number(lead.dealValue).toLocaleString()}` : '—',
                    },
                    {
                      label: 'Intake',
                      value: (lead.intakeMonth && lead.intakeYear)
                        ? `${MONTH_NAMES[lead.intakeMonth - 1]} ${lead.intakeYear}`
                        : (lead.intakeMonth ? MONTH_NAMES[lead.intakeMonth - 1] : (lead.intakeYear ? String(lead.intakeYear) : '—'))
                    },
                    { label: 'Study Destination', value: lead.destinationCountry ?? '—' },
                    { label: 'Program of Interest', value: lead.programOfInterest ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Lead Fields card */}
              <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700 ${isDeadState ? 'pointer-events-none opacity-50' : ''}`}>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Edit Lead Fields</h2>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {(
                    [
                      ['fullName', 'Full Name'],
                      ['email', 'Email'],
                      ['contactNumber', 'Phone'],
                      ['city', 'City'],
                      ['country', 'Country'],
                      ['lastQualification', 'Qualification'],
                      ['grades', 'Grades'],
                      ['destinationCountry', 'Study Destination'],
                      ['programOfInterest', 'Program of Interest'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                      <input
                        value={profileForm[key]}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="h-9 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      />
                    </label>
                  ))}

                  {/* Intake Fields */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Intake Month</span>
                    <Select
                      value={profileForm.intakeMonth || undefined}
                      onValueChange={(val) => setProfileForm((prev) => ({ ...prev, intakeMonth: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Month..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Intake Year</span>
                    <Select
                      value={profileForm.intakeYear || undefined}
                      onValueChange={(val) => setProfileForm((prev) => ({ ...prev, intakeYear: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Year..." />
                      </SelectTrigger>
                      <SelectContent>
                        {intakeYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <div className="col-span-2 grid grid-cols-3 gap-3">
                    <label className="col-span-1 flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Currency</span>
                      <Select
                        value={profileForm.dealCurrency}
                        onValueChange={(val) => setProfileForm((prev) => ({ ...prev, dealCurrency: val }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="col-span-2 flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Deal Value <span className="text-gray-400 font-normal">(optional)</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={profileForm.dealValue}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, dealValue: e.target.value }))
                        }
                        className="h-9 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleSaveLeadProfile}
                  disabled={editingLead || isDeadState}
                  className="mt-4 h-9 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {editingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead Profile'}
                </button>
              </div>

              {/* Lead Revenue */}
              <div className={isDeadState ? 'pointer-events-none opacity-50' : ''}>
                <LeadRevenueCard leadId={lead.id} />
              </div>
            </div>

            {/* Right Column: Assigned To + Mark as Dead + Delete Lead + Save Logs */}
            <div className="md:col-span-1 space-y-6">
              {/* Assigned To */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Assigned To</h2>
                <div className="flex flex-col gap-2">
                  <Select
                    value={selectedAssignee || 'unassigned'}
                    disabled={isDeadState || savingAssignee}
                    onValueChange={(val) => setSelectedAssignee(val === 'unassigned' ? '' : val)}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {proUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.id} {u.role === 'ADMIN' ? '(Admin)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={handleSaveAssign}
                    disabled={selectedAssignee === assignedTo || isDeadState || savingAssignee}
                    className="w-full h-9 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    {savingAssignee ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                  {proUsers.length === 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      No team members yet. Add them in Team settings.
                    </p>
                  )}
                </div>
              </div>

              {/* Mark as Dead */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Mark as Dead</h2>
                <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={isDead}
                    disabled={isDeadState}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsDead(checked);
                      if (!checked) setDeadReason('');
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-sky-500"
                  />
                  Mark Lead as Dead
                </label>
                {isDead && !isDeadState && (
                  <textarea
                    value={deadReason}
                    onChange={(e) => setDeadReason(e.target.value)}
                    placeholder="Reason for marking dead…"
                    className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                    rows={3}
                  />
                )}
                {isDeadState && (
                  <div className="mt-2 text-sm text-slate-500">
                    <span className="font-medium text-gray-700 dark:text-slate-300">Reason:</span> {deadReason || 'No reason provided'}
                  </div>
                )}
                {(isDead || isDeadState) && (
                  <button
                    onClick={handleMarkDead}
                    disabled={savingDead || (isDead && !isDeadState && !deadReason.trim())}
                    className="mt-3 w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center"
                  >
                    {savingDead ? <Loader2 className="h-4 w-4 animate-spin" /> : isDeadState ? 'Re‑open Lead' : 'Confirm Dead'}
                  </button>
                )}
              </div>

              {/* Delete Lead */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Delete Lead</h2>
                <LeadDeleteButton
                  leadId={lead.id}
                  leadName={lead.fullName}
                  redirectPath={tenantPath(tenantSlug, '/admin/leads')}
                  disabled={isDeadState}
                />
              </div>

              {/* Save Logs */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                  Save Logs
                </h2>
                <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-lg w-max border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
                  {(['note', 'call', 'message'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLogType(t)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-medium capitalize ${logType === t ? 'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-600' : 'border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={logBody}
                  onChange={(e) => setLogBody(e.target.value)}
                  placeholder="Write your log here..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                />
                <button
                  onClick={handleSaveLog}
                  disabled={!logBody.trim() || logSaving}
                  className="mt-3 w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {logSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Log'}
                </button>
                {logSaved && <p className="text-emerald-600 text-xs mt-2 text-center font-medium">Log saved ✓</p>}
                {logError && <p className="text-red-600 text-xs mt-2 text-center font-medium">Failed to save log</p>}

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Log History</h3>
                  <div className="max-h-[320px] overflow-y-auto space-y-3 pr-2">
                    {logsLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
                    ) : logs.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No logs yet</p>
                    ) : (
                      logs.map((log: any) => (
                        <div key={log.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${log.type === 'call' ? 'bg-emerald-100 text-emerald-700' :
                            log.type === 'message' ? 'bg-violet-100 text-violet-700' :
                              'bg-sky-100 text-sky-700'
                            }`}>{log.type}</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">{log.body}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {log.userName} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==== Pipeline ==== */}
        <TabsContent value="pipeline" className="outline-none">
          <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700 ${isDeadState ? 'pointer-events-none opacity-50' : ''}`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Pipeline Stage</h2>
            {stagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(pipelineStages.length > 0
                    ? pipelineStages.map((s) => ({
                      value: s.key,
                      label: s.label,
                      mutedClasses:
                        styleByKey[s.key]?.mutedClasses ??
                        'bg-gray-500/10 text-gray-400 border-gray-500/20',
                    }))
                    : PIPELINE_STAGES
                  ).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStageToggle(s.value)}
                      className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${primaryStage === s.value
                        ? s.mutedClasses
                        : activeStages.includes(s.value)
                          ? 'bg-brand-light border-brand/30 text-brand'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 dark:bg-[#0f172a] dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                      {activeStages.includes(s.value) && <span className="mr-1">✓</span>}
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Sub Status & Action */}
                <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-xl p-4 mt-6">
                  <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Sub Status <span className="text-red-400">*</span>
                      </label>
                      <Select
                        value={selectedSubStatusId ?? undefined}
                        onValueChange={(val) => {
                          setSelectedSubStatusId(val || null)
                          setSelectedClosedAction(null)
                          setSubStatusFieldValues({})
                        }}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="— Select sub status —" />
                        </SelectTrigger>
                        <SelectContent>
                          {subStatuses.map((ss) => (
                            <SelectItem key={ss.id} value={ss.id}>{ss.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSubStatusId && needsClosedAction && (
                      <div className="flex-1 w-full">
                        <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                          Closed Action <span className="text-red-400">*</span>
                        </label>
                        <Select
                          value={selectedClosedAction ?? undefined}
                          onValueChange={(val) => setSelectedClosedAction(val || null)}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="— Select action —" />
                          </SelectTrigger>
                          <SelectContent>
                            {closedActions.map((a) => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {selectedSubStatusId && needsCustomFields && (
                    <SubStatusCustomFieldsForm
                      fields={activeCustomFields}
                      values={subStatusFieldValues}
                      onChange={handleSubStatusFieldChange}
                    />
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubStatusSave}
                      disabled={savingSubStatus || !canSaveSubStatus}
                      className="h-10 px-6 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-all w-full sm:w-auto flex items-center justify-center gap-1.5"
                    >
                      {savingSubStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ==== Activity ==== */}
        <TabsContent value="activity" className="outline-none">
          {/* Add Activity UI */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Add Activity</h2>
            <div className="flex gap-2 mb-3">
              {(['note', 'call', 'message'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${noteType === t ? 'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-600' : 'border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Add a ${noteType}...`}
              rows={3}
              disabled={isDeadState}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
            <button
              onClick={handleAddNote}
              disabled={isDeadState || !note.trim() || addingNote}
              className="mt-2 h-9 px-4 bg-brand hover:bg-brand-hover disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </button>
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm mt-4 dark:bg-[#0f172a] dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Activity Log</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Full timeline: who changed what, with email and exact date and time (newest first).
            </p>
            <LeadActivityTimeline activities={initialActivities} stageLabels={stageLabelByKey} />
          </div>
        </TabsContent>

        {/* ==== Reminders ==== */}
        <TabsContent value="reminders" className="outline-none">
          <div className={isDeadState ? 'pointer-events-none opacity-50' : ''}>
            <LeadReminders leadId={lead.id} />
          </div>
        </TabsContent>

        {/* ==== WhatsApp ==== */}
        <TabsContent value="whatsapp" className="outline-none">
          <div className={isDeadState ? 'pointer-events-none opacity-50' : ''}>
            <WhatsappLogger
              leadId={lead.id}
              tenantSlug={tenantSlug}
              leadName={lead.fullName}
              leadCountry={lead.country ?? null}
              leadProgramme={lead.lastQualification ?? null}
              currentStage={primaryStage}
              leadPhone={lead.contactNumber}
            />
          </div>
        </TabsContent>

        {/* ==== Application ==== */}
        <TabsContent value="application" className="outline-none">
          <ApplicationTab leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  </TooltipProvider>
  )
}