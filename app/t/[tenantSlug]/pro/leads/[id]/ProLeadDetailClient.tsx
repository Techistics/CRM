'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Loader2, Check, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Lead } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { tenantPath } from '@/lib/tenant-path'
import { LeadDocumentsPanel } from '@/components/leads/LeadDocumentsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiCall } from '@/lib/utils/api-handler'
import { StudentJourney } from '@/components/leads/StudentJourney'
import { WhatsappLogger } from '@/components/leads/WhatsappLogger'
import { LeadReminders } from '@/components/leads/LeadReminders'
import { TooltipProvider } from '@/components/ui/tooltip'

import type { ActivityRow } from '@/types/leads'

export default function ProLeadDetailClient({
  lead,
  activities: initialActivities,
  allUsers,
  currentUser,
}: {
  lead: Lead
  activities: ActivityRow[]
  allUsers: { id: string; name: string | null; role: string }[]
  currentUser: { id: string }
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

  const [stage, setStage] = useState<string>(lead.primaryStage ?? lead.stage ?? 'new_lead')
  const [pipelineStages, setPipelineStages] = useState<Array<{ key: string; label: string }>>([])
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false);
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [isDeadState, setIsDeadState] = useState<boolean>(lead.isDeadManual ?? false)
  // NEW – dead‑status UI state
  
  const [isDead, setIsDead] = useState<boolean>(lead.isDeadManual ?? false);
  const [deadReason, setDeadReason] = useState<string>(lead.deadReason ?? '');
  const [savingDead, setSavingDead] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [editingLead, setEditingLead] = useState(false);

  const [logType, setLogType] = useState<'note' | 'call' | 'message'>('note')
  const [logBody, setLogBody] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logSaved, setLogSaved] = useState(false)
  const [logError, setLogError] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const [profileForm, setProfileForm] = useState<any>({
    fullName: lead.fullName ?? '',
    email: lead.email ?? '',
    contactNumber: lead.contactNumber ?? '',
    city: lead.city ?? '',
    country: lead.country ?? '',
    lastQualification: lead.lastQualification ?? '',
    grades: lead.grades ?? '',
    intakeMonth: lead.intakeMonth ?? '',
    destinationCountry: lead.destinationCountry ?? '',
    programOfInterest: lead.programOfInterest ?? '',
    dealValue: lead.dealValue ?? '',
    dealCurrency: lead.dealCurrency ?? 'USD',
  });

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/pipeline-stages')
        const data = await res.json()
        setPipelineStages((data?.data?.stages ?? data?.stages ?? []) as Array<{ key: string; label: string }>)
      } catch {
        setPipelineStages([])
      }
    })()
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setIsDead(lead.isDeadManual ?? false);
    setDeadReason(lead.deadReason ?? '');
  }, [lead.isDeadManual, lead.deadReason]);
  



  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setProfileForm({
      fullName: lead.fullName ?? '',
      email: lead.email ?? '',
      contactNumber: lead.contactNumber ?? '',
      city: lead.city ?? '',
      country: lead.country ?? '',
      lastQualification: lead.lastQualification ?? '',
      grades: lead.grades ?? '',
      intakeMonth: lead.intakeMonth ?? '',
      destinationCountry: lead.destinationCountry ?? '',
      programOfInterest: lead.programOfInterest ?? '',
      dealValue: lead.dealValue ?? '',
      dealCurrency: lead.dealCurrency ?? 'USD',
    });
  }, [lead]);

  const stageLabelByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of pipelineStages) map.set(s.key, s.label)
    return map
  }, [pipelineStages])

  const colorByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of PIPELINE_STAGES) map.set(s.value, s.badgeClasses)
    return map
  }, [])

  const adminUsers = useMemo(() => allUsers.filter((u) => u.role === 'ADMIN'), [allUsers])

  const handleAssign = async (userId: string) => {
    setAssignedTo(userId)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: userId }),
      })
      return res.json()
    }, { successMsg: 'Lead assigned', errorMsg: 'Could not assign lead' })
    if (!data) {
      setAssignedTo(lead.assignedTo ?? '')
      return
    }
    router.refresh()
  }

  async function handleStageChange(newStage: string) {
     if (newStage === stage) return
     const previous = stage
     setStage(newStage)
     setSaving(true)
     const data = await apiCall(async () => {
       const res = await fetch(`/api/pro/leads/${lead.id}/stage`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           primaryStage: newStage, 
           activeStages: [newStage] 
         }),
       })
       return res.json()
     }, { successMsg: 'Stage updated', errorMsg: 'Could not save the new stage' })
     if (!data) {
       setStage(previous)
       setSaving(false)
       return
     }
     router.refresh()
     setSaving(false)
   }

  async function handleAddNote() {
    if (!note.trim()) return
    setAddingNote(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/pro/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, type: noteType }),
      })
      return res.json()
    }, { successMsg: 'Activity added', errorMsg: 'Failed to add activity' })
    if (!data) {
      setAddingNote(false)
      return
    }
    setNote('')
    setAddingNote(false)
    router.refresh()
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

  useEffect(() => { fetchLogs() }, [lead.id])

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
      } else {
        setLogError(true)
      }
    } catch {
      setLogError(true)
    } finally {
      setLogSaving(false)
    }
  }

  // NEW – handle dead‑status save
  const handleSaveLeadProfile = async () => {
    setEditingLead(true)

    const data = await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...profileForm,
            intakeMonth: profileForm.intakeMonth?.trim() || null,
            destinationCountry: profileForm.destinationCountry?.trim() || null,
            programOfInterest: profileForm.programOfInterest?.trim() || null,
            dealValue: profileForm.dealValue === '' ? null : Number(profileForm.dealValue),
          }),
        })
        return res.json()
      },
      {
        successMsg: 'Lead updated',
        errorMsg: 'Could not update lead profile',
      },
    )

    setEditingLead(false)

    if (!data) return
    // Refresh the page so UI reflects the latest DB state
    router.refresh()
  }
  
  const handleMarkDead = async () => {
    setSavingDead(true)
    const payloadIsDead = isDeadState ? false : isDead;
    const payloadReason = payloadIsDead ? deadReason : null;

    const payload = {
      isDeadManual: payloadIsDead,
      deadReason: payloadReason,
    }
    const data = await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        return res.json()
      },
      {
        successMsg: payloadIsDead ? 'Lead marked as dead' : 'Lead reopened',
        errorMsg: 'Failed to update lead status',
      },
    )
    setSavingDead(false)
    if (!data) return
    setIsDeadState(payloadIsDead);
    setIsDead(payloadIsDead);
    if (!payloadIsDead) setDeadReason('');
    router.refresh()
  }
  

  const currentStageLabel = stageLabelByKey.get(stage) ?? stage
  const currentStageColor =
    colorByKey.get(stage) ?? 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm'

  return (
    <TooltipProvider>
      <div className="mx-auto w-full min-w-0 max-w-6xl px-0 py-4 sm:px-2 sm:py-6 lg:px-4 lg:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={tenantSlug ? tenantPath(tenantSlug, '/pro/leads') : '/pro/leads'}
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to My Leads
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-3">{lead.fullName}</h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{currentStageLabel}</span>{isDeadState && (
              <span className="ml-2 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 text-xs">
                Dead
              </span>
            )}
            {saving && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
        </div>
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

                {isDeadState && (
            <div className="mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 text-center">
              This lead is marked as dead. Reopen it to make changes.
            </div>
          )}
          <Tabs value={activeTab} className="w-full">
        {/* Sticky tab list */}
        <TabsList className="mb-6 inline-flex w-auto sticky top-[60px] z-10 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 pb-0">
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')}>Overview</TabsTrigger>
          <TabsTrigger value="documents" onClick={() => setActiveTab('documents')}>Documents</TabsTrigger>
          <TabsTrigger value="pipeline" onClick={() => setActiveTab('pipeline')}>Pipeline</TabsTrigger>
          <TabsTrigger value="activity" onClick={() => setActiveTab('activity')}>Activity</TabsTrigger>
          <TabsTrigger value="reminders" onClick={() => setActiveTab('reminders')}>Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp" onClick={() => setActiveTab('whatsapp')}>WhatsApp</TabsTrigger>
        </TabsList>

        {/* ==== Documents ==== */}
        <TabsContent value="documents" className="outline-none">
          <div className="min-h-[400px] overflow-hidden rounded-2xl bg-gray-900 p-4 shadow-2xl sm:rounded-3xl sm:p-6 lg:p-8 lg:min-h-[600px]">
            <LeadDocumentsPanel leadId={lead.id} />
          </div>
        </TabsContent>

        {/* ==== Overview ==== */}
        <TabsContent value="overview" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <StudentJourney
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                stage={stage as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onStepClick={(newStage) => handleStageChange(newStage as any)}
              />
              {/* Contact Info */}
              <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700 ${isDeadState ? 'pointer-events-none opacity-50' : ''}`}>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-brand-light text-brand flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </span>
                  Contact Info
                </h2>
                <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
                  {[
                    { label: 'Email', value: lead.email },
                    { label: 'Phone', value: lead.contactNumber },
                    { label: 'City', value: lead.city },
                    { label: 'Country', value: lead.country },
                    { label: 'Qualification', value: lead.lastQualification },
                    { label: 'Grades', value: lead.grades },
                    { label: 'Source', value: lead.source },
                    { label: 'Intake', value: lead.intakeMonth ?? '—' },
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
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </span>
                  Edit Lead Fields
                </h2>
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
                      ['intakeMonth', 'Intake'],
                      ['destinationCountry', 'Study Destination'],
                      ['programOfInterest', 'Program of Interest'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                      <input
                        value={profileForm[key]}
                        onChange={(e) =>
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          setProfileForm((prev: any) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="h-9 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      />
                    </label>
                  ))}
                  <div className="col-span-2 grid grid-cols-3 gap-3">
                    <label className="col-span-1 flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Currency</span>
                      <select
                        value={profileForm.dealCurrency}
                        onChange={(e) =>
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          setProfileForm((prev: any) => ({ ...prev, dealCurrency: e.target.value }))
                        }
                        className="h-9 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      >
                        {['USD','EUR','GBP','CAD','AUD','INR'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
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
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          setProfileForm((prev: any) => ({ ...prev, dealValue: e.target.value }))
                        }
                        className="h-9 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setEditingLead(true)
                    const data = await apiCall(async () => {
                      const res = await fetch(`/api/leads/${lead.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...profileForm,
                          intakeMonth: profileForm.intakeMonth?.trim() || null,
                          destinationCountry: profileForm.destinationCountry?.trim() || null,
                          programOfInterest: profileForm.programOfInterest?.trim() || null,
                          dealValue: profileForm.dealValue === '' ? null : Number(profileForm.dealValue),
                        }),
                      })
                      return res.json()
                    }, { successMsg: 'Lead updated', errorMsg: 'Could not update lead profile' })
                    setEditingLead(false)
                    if (data) router.refresh()
                  }}
                  disabled={editingLead}
                  className="mt-4 h-9 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {editingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lead Profile'}
                </button>
              </div>

              {/* NEW – Assigned To UI */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Assigned To</h2>
                <select
                  value={assignedTo}
                  disabled={isDeadState || lead.assignedTo !== currentUser.id}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  <option value="">Unassigned</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.id}</option>
                  ))}
                </select>
                {lead.assignedTo !== currentUser.id && (
                  <p className="mt-1.5 text-xs text-amber-600">You can only transfer leads that you currently own.</p>
                )}
              </div>

              {/* NEW – Mark as Dead UI */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
                <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={isDead}
                    disabled={isDeadState}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsDead(checked)
                      if (!checked) setDeadReason('')
                    }}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                  />
                  Mark Lead as Dead
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
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-gray-700 dark:text-slate-300">Reason:</span> {deadReason || 'No reason provided'}
                  </div>
                )}
                {(isDead || isDeadState) && (
                  <button
                    onClick={handleMarkDead}
                    disabled={savingDead || (isDead && !isDeadState && !deadReason.trim())}
                    className="mt-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded"
                  >
                    {savingDead ? <Loader2 className="h-4 w-4 animate-spin" /> : isDeadState ? 'Re‑open' : 'Save'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Save Logs */}
            <div className="md:col-span-1 space-y-6">
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
                      className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-medium capitalize shadow-sm ${
                        logType === t ? 'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-600' : 'border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
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
                {logSaved && <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2 text-center font-medium">Log saved ✓</p>}
                {logError && <p className="text-red-600 dark:text-red-400 text-xs mt-2 text-center font-medium">Failed to save log</p>}

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Log History</h3>
                  <div className="max-h-[320px] overflow-y-auto space-y-3 pr-2">
                    {logsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                      </div>
                    ) : logs.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No logs yet</p>
                    ) : (
                      logs.map((log: any) => (
                        <div key={log.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            log.type === 'call' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            log.type === 'message' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' :
                            'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                          }`}>
                            {log.type}
                          </span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">{log.body}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {log.userName} &middot; {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
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
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </span>
              Pipeline Stage
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(pipelineStages.length ? pipelineStages.map((s) => s.key) : PIPELINE_STAGES.map((s) => s.value)).map((s) => {
                const isSelected = stage === s
                const stageLabel = stageLabelByKey.get(s) ?? PIPELINE_STAGES.find((x) => x.value === s)?.label ?? s
                return (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    disabled={isDeadState}
                    className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? 'bg-brand-light border-brand/30 text-brand'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 dark:bg-[#0f172a] dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-brand bg-brand text-white' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      {stageLabel}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ==== Activity ==== */}
        <TabsContent value="activity" className="outline-none">
          {/* Add Activity UI */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </span>
              Add Activity
            </h2>
            <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-lg w-max border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
              {(['note', 'call', 'message'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-medium capitalize shadow-sm ${
                    noteType === t ? 'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-[#0f172a] dark:text-slate-100 dark:border-slate-600' : 'border border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Add a ${noteType} for future reference...`}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleAddNote}
                disabled={isDeadState || !note.trim() || addingNote}
                className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Activity'}
              </button>
            </div>
          </div>
          {/* Activity Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm mt-4 dark:bg-[#0f172a] dark:border-slate-700">
            <h2 className="text-gray-900 font-semibold mb-2 dark:text-slate-100">Activity Log</h2>
            <p className="text-gray-500 text-xs mb-6 font-medium dark:text-slate-400">Historical timeline of status changes, calls, notes, and messages.</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 dark:bg-slate-800/40 dark:border-slate-700/50">
              <LeadActivityTimeline activities={initialActivities} stageLabels={Object.fromEntries(stageLabelByKey)} />
            </div>
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
              currentStage={stage as any}
              leadPhone={lead.contactNumber}
            />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  )
}