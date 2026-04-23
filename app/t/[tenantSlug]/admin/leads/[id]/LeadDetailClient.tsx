'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { DollarSign, Loader2 } from 'lucide-react'
import type { Lead, LeadStage } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { toast } from 'sonner'
import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { TagSelector } from '@/components/lead/TagSelector'

const STAGES: { value: LeadStage; label: string }[] = PIPELINE_STAGES.map(
  (s) => ({ value: s.value, label: s.label }),
)

const STAGE_COLORS: Record<string, string> = {
  new_lead:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  unresponsive:     'bg-gray-500/10 text-gray-400 border-gray-500/20',
  follow_up:        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  docs_received:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  options_sent:     'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  final_decision:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  walkin_booked:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  walkin_conducted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  cancelled:        'bg-red-500/10 text-red-400 border-red-500/20',
  paid:             'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

import type { ActivityRow, UserRow } from '@/types/leads'
import { tenantPath } from '@/lib/tenant-path'
import type { LeadReminder } from '@/types/models'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadDocumentsPanel } from '@/components/lead/LeadDocumentsPanel'
import { apiCall } from '@/lib/utils/api-handler'

export default function LeadDetailClient({
  lead,
  activities: initialActivities,
  allUsers,
  tags,
}: {
  lead: Lead
  activities: ActivityRow[]
  allUsers: UserRow[]
  tags: { id: string; name: string; color: string }[]
}) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')
  const [stage, setStage] = useState(lead.stage ?? 'new_lead')
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [editingLead, setEditingLead] = useState(false)
  const [reminders, setReminders] = useState<LeadReminder[]>([])
  const [loadingReminders, setLoadingReminders] = useState(true)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [reminderDueAt, setReminderDueAt] = useState('')
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

  useEffect(() => {
    async function loadReminders() {
      setLoadingReminders(true)
      const data = await apiCall(async () => {
        const res = await fetch(`/api/leads/${lead.id}/reminders`)
        return res.json()
      }, { errorMsg: 'Failed to load reminders' })
      setReminders((data as { reminders?: LeadReminder[] } | null)?.reminders ?? [])
      setLoadingReminders(false)
    }

    loadReminders()
  }, [lead.id])

  async function handleStageChange(newStage: Lead['stage']) {
    const previous = stage
    setStage(newStage)
    setSaving(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      return res.json()
    }, { successMsg: 'Lead stage updated', errorMsg: 'Stage update failed' })
    setSaving(false)
    if (!data) {
      setStage(previous)
      return
    }
    router.refresh()
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


  async function createReminder() {
    if (!reminderTitle.trim() || !reminderDueAt) return
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reminderTitle,
          note: reminderNote,
          dueAt: new Date(reminderDueAt).toISOString(),
        }),
      })
      return res.json()
    }, { successMsg: 'Reminder added', errorMsg: 'Could not create reminder' })
    if (!data) return
    const reminder = (data as { reminder?: LeadReminder }).reminder
    if (reminder) {
      setReminders((prev) => [...prev, reminder].sort((a, b) => +new Date(a.dueAt ?? 0) - +new Date(b.dueAt ?? 0)))
    }
    setReminderTitle('')
    setReminderNote('')
    setReminderDueAt('')
  }

  async function completeReminder(reminderId: string) {
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${lead.id}/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      return res.json()
    }, { successMsg: 'Reminder completed', errorMsg: 'Failed to complete reminder' })
    const reminder = (data as { reminder?: LeadReminder } | null)?.reminder
    if (!reminder) return
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? reminder : r)))
  }

  const stageLabel = STAGES.find((s) => s.value === stage)?.label ?? stage

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
            <span className={`rounded-md border px-2 py-1 text-xs ${STAGE_COLORS[stage]}`}>
              {stageLabel}
            </span>
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
                    {['USD', 'GBP', 'EUR', 'PKR', 'AED', 'CAD', 'AUD'].map(c => (
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
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleStageChange(s.value)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                    stage === s.value
                      ? STAGE_COLORS[s.value]
                      : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {stage === s.value && <span className="mr-1">✓</span>}
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
            <LeadActivityTimeline activities={initialActivities} />
          </div>


          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-medium mb-4">Follow-up Reminders</h2>
            <div className="space-y-2 mb-4">
              <input
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                placeholder="Reminder title"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="Optional note"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="datetime-local"
                value={reminderDueAt}
                onChange={(e) => setReminderDueAt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={createReminder}
                className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg"
              >
                Add Reminder
              </button>
            </div>

            {loadingReminders ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-gray-500">No reminders yet.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-sm text-white font-medium">{reminder.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Due {reminder.dueAt ? new Date(reminder.dueAt).toLocaleString() : '—'}
                        </p>
                        {reminder.note && <p className="text-xs text-gray-500 mt-1">{reminder.note}</p>}
                      </div>
                      {reminder.status !== 'completed' && (
                        <button
                          onClick={() => completeReminder(reminder.id)}
                          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}