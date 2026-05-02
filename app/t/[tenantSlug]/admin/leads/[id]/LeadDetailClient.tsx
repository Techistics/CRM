'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { DollarSign, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Lead } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { TagSelector } from '@/components/lead/TagSelector'
import { CURRENCIES } from '@/constants/lead-options'
import { LeadReminders } from '@/components/lead/LeadReminders'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import type { ActivityRow, UserRow } from '@/types/leads'
import { tenantPath } from '@/lib/tenant-path'
import { getHeatLevel, heatConfig } from '@/lib/leads/heat'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadDocumentsPanel } from '@/components/lead/LeadDocumentsPanel'
import { apiCall } from '@/lib/utils/api-handler'
import { WhatsappLogger } from '@/components/leads/WhatsappLogger'
import { StudentJourney } from '@/components/leads/StudentJourney'

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
  const [primaryStage, setPrimaryStage] = useState<string>(
    lead.primaryStage ?? lead.stage ?? 'new_lead',
  )
  const [activeStages, setActiveStages] = useState<string[]>(
    activeStagesProp?.length ? activeStagesProp : [(lead.primaryStage ?? lead.stage ?? 'new_lead')],
  )
  const [pipelineStages, setPipelineStages] = useState<Array<{ key: string; label: string }>>([])
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [editingLead, setEditingLead] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: lead.fullName ?? '',
    email: lead.email ?? '',
    contactNumber: lead.contactNumber ?? '',
    city: lead.city ?? '',
    country: lead.country ?? DEFAULT_LEAD_COUNTRY,
    lastQualification: lead.lastQualification ?? '',
    grades: lead.grades ?? '',
    dealValue: lead.dealValue ?? '',
    dealCurrency: lead.dealCurrency ?? 'USD',
  })

  const proUsers = allUsers.filter((u) => u.role === 'PRO')

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
    ;(async () => {
      try {
        const res = await fetch('/api/pipeline-stages')
        const data = await res.json()
        const rows = (data?.data?.stages ?? data?.stages ?? []) as Array<{ key: string; label: string }>
        setPipelineStages(rows)
      } catch {
        // If this fails, we still allow fallback single-stage behavior.
      }
    })()
  }, [])

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
    const prevPrimary = primaryStage
    const prevActive = activeStages

    const nextActive = prevActive.includes(stageKey)
      ? prevActive.filter((s) => s !== stageKey)
      : [...prevActive, stageKey]

    // Always keep at least one active stage.
    if (nextActive.length === 0) return

    // If removing the current primary, promote the last stage in list.
    let nextPrimary = prevPrimary
    if (!nextActive.includes(nextPrimary)) {
      nextPrimary = nextActive[nextActive.length - 1]
    }

    // If adding a stage, make it primary (simple rule).
    if (!prevActive.includes(stageKey)) {
      nextPrimary = stageKey
    }

    setPrimaryStage(nextPrimary)
    setActiveStages(nextActive)

    const ok = await persistStages(nextPrimary, nextActive)
    if (!ok) {
      setPrimaryStage(prevPrimary)
      setActiveStages(prevActive)
    }
  }

  async function handleAssign(newAssignedTo: string) {
    setAssignedTo(newAssignedTo)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: newAssignedTo || null }),
      })
      return res.json()
    }, { successMsg: 'Lead assigned', errorMsg: 'Assignment update failed' })
    if (!data) return
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
          dealValue: profileForm.dealValue === '' ? null : Number(profileForm.dealValue)
        }),
      })
      return res.json()
    }, { successMsg: 'Lead updated', errorMsg: 'Could not update lead profile' })
    setEditingLead(false)
    if (!data) return
    router.refresh()
  }



  const heat = getHeatLevel(
    lead.lastContactedAt ? new Date(lead.lastContactedAt) : null,
    lead.createdAt ? new Date(lead.createdAt) : new Date(),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={
              tenantSlug ? tenantPath(tenantSlug, '/admin/leads') : '/admin/leads'
            }
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to Leads
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {lead.fullName}
            </h1>
            {lead.dealValue && (
              <div className="flex items-center gap-1.5 text-sm font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{lead.dealCurrency} {Number(lead.dealValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <TagSelector leadId={lead.id} initialTags={tags} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-md border px-2 py-1 text-xs ${stageBadge.mutedClasses}`}>
              {stageBadge.label}
            </span>
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
                  {heatConfig[heat].icon} {heatConfig[heat].label}
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="outline-none">
          <LeadDocumentsPanel leadId={lead.id} />
        </TabsContent>

        <TabsContent value="overview" className="outline-none">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left — lead info + pipeline */}
        <div className="space-y-6 xl:col-span-2">

          <StudentJourney 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stage={primaryStage as any} 
            onStepClick={(newStage) => handleStageToggle(String(newStage))} 
          />

          {/* Info card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Contact Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Email', value: lead.email },
                { label: 'Phone', value: lead.contactNumber },
                { label: 'City', value: lead.city },
                  { label: 'Country', value: lead.country },
                { label: 'Qualification', value: lead.lastQualification },
                { label: 'Grades', value: lead.grades },
                { label: 'Source', value: lead.source },
                { label: 'Deal Value', value: lead.dealValue ? `${lead.dealCurrency} ${Number(lead.dealValue).toLocaleString()}` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-500">{label}</p>
                  <p className="text-white mt-0.5">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Edit Lead Fields</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  ['fullName', 'Full Name'],
                  ['email', 'Email'],
                  ['contactNumber', 'Phone'],
                  ['city', 'City'],
                  ['country', 'Country'],
                  ['lastQualification', 'Qualification'],
                  ['grades', 'Grades'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">{label}</span>
                  <input
                    value={profileForm[key]}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </label>
              ))}
              
              <div className="col-span-2 grid grid-cols-3 gap-3">
                <label className="col-span-1 flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Currency</span>
                  <select
                    value={profileForm.dealCurrency}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, dealCurrency: e.target.value }))
                    }
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Deal Value <span className="text-muted-foreground">(optional)</span></span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={profileForm.dealValue}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, dealValue: e.target.value }))
                    }
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </label>
              </div>
            </div>
            <button
              onClick={handleSaveLeadProfile}
              disabled={editingLead}
              className="mt-3 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {editingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead Profile'}
            </button>
          </div>

          {/* Pipeline stage selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Pipeline Stage</h2>
            <div className="grid grid-cols-2 gap-2">
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
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                    primaryStage === s.value
                      ? s.mutedClasses
                      : activeStages.includes(s.value)
                        ? 'border-gray-600 text-gray-200 bg-gray-800/40'
                        : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {activeStages.includes(s.value) && <span className="mr-1">✓</span>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add note */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Add Activity</h2>
            <div className="flex gap-2 mb-3">
              {(['note', 'call', 'message'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                    noteType === t
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={handleAddNote}
              disabled={!note.trim() || addingNote}
              className="mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>

        {/* Right — assign + activity */}
        <div className="space-y-6">

          {/* Assign */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Assigned To</h2>
            <select
              value={assignedTo}
              onChange={(e) => handleAssign(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">Unassigned</option>
              {proUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {proUsers.length === 0 && (
              <p className="text-gray-600 text-xs mt-2">
                No pro agents yet. Add them in Team settings.
              </p>
            )}
          </div>

          {/* Activity log */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Activity Log</h2>
            <p className="text-gray-500 text-xs mb-4">
              Full timeline: who changed what, with email and exact date and time (newest first).
            </p>
            <LeadActivityTimeline activities={initialActivities} stageLabels={stageLabelByKey} />
          </div>


          <LeadReminders leadId={lead.id} />

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
      </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}