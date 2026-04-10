'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Lead, LeadStage } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { useToast } from '@/hooks/use-toast'

const STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new_lead',         label: 'New Lead' },
  { value: 'unresponsive',     label: 'Unresponsive' },
  { value: 'follow_up',        label: 'Follow Up' },
  { value: 'docs_received',    label: 'Docs Received' },
  { value: 'options_sent',     label: 'Options Sent' },
  { value: 'final_decision',   label: 'Final Decision' },
  { value: 'walkin_booked',    label: 'Walk-in Booked' },
  { value: 'walkin_conducted', label: 'Walk-in Done' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'paid',             label: 'Paid' },
]

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
import type { LeadDocumentChecklistItem, LeadReminder } from '@/types/models'

export default function LeadDetailClient({
  lead,
  activities: initialActivities,
  allUsers,
}: {
  lead: Lead
  activities: ActivityRow[]
  allUsers: UserRow[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [stage, setStage] = useState(lead.stage ?? 'new_lead')
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [editingLead, setEditingLead] = useState(false)
  const [checklistItems, setChecklistItems] = useState<LeadDocumentChecklistItem[]>([])
  const [loadingChecklist, setLoadingChecklist] = useState(true)
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
    country: lead.country ?? 'India',
    lastQualification: lead.lastQualification ?? '',
    grades: lead.grades ?? '',
  })

  const proUsers = allUsers.filter((u) => u.role === 'agent')
  const checklistProgress = useMemo(() => {
    if (checklistItems.length === 0) return { done: 0, total: 0 }
    const done = checklistItems.filter((item) => item.isSubmitted === 'true').length
    return { done, total: checklistItems.length }
  }, [checklistItems])

  useEffect(() => {
    async function loadChecklist() {
      setLoadingChecklist(true)
      const res = await fetch(`/api/leads/${lead.id}/checklist`)
      const data = await res.json()
      setChecklistItems(data.items ?? [])
      setLoadingChecklist(false)
    }

    async function loadReminders() {
      setLoadingReminders(true)
      const res = await fetch(`/api/leads/${lead.id}/reminders`)
      const data = await res.json()
      setReminders(data.reminders ?? [])
      setLoadingReminders(false)
    }

    loadChecklist()
    loadReminders()
  }, [lead.id])

  async function handleStageChange(newStage: Lead['stage']) {
    setStage(newStage)
    setSaving(true)
    await fetch(`/api/leads/${lead.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    setSaving(false)
    toast({ title: 'Stage Updated', description: 'Lead stage has been successfully updated.' })
    router.refresh()
  }

  async function handleAssign(newAssignedTo: string) {
    setAssignedTo(newAssignedTo)
    await fetch(`/api/leads/${lead.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: newAssignedTo || null }),
    })
    toast({ title: 'Lead Assigned', description: 'Assignment updated successfully.' })
    router.refresh()
  }

  async function handleAddNote() {
    if (!note.trim()) return
    setAddingNote(true)
    await fetch(`/api/leads/${lead.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, type: noteType }),
    })
    setNote('')
    setAddingNote(false)
    toast({ title: 'Activity Added', description: 'Your note was attached to the lead.' })
    router.refresh()
  }

  async function handleSaveLeadProfile() {
    setEditingLead(true)
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    })
    setEditingLead(false)
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update lead profile.' })
      return
    }
    toast({ title: 'Lead Updated', description: 'Core lead fields saved successfully.' })
    router.refresh()
  }

  async function toggleChecklistItem(itemId: string, nextSubmitted: boolean) {
    const res = await fetch(`/api/leads/${lead.id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, isSubmitted: nextSubmitted }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Checklist Update Failed', description: 'Unable to update checklist item.' })
      return
    }
    const data = await res.json()
    setChecklistItems((prev) =>
      prev.map((it) => (it.id === itemId ? data.item : it)),
    )
  }

  async function createReminder() {
    if (!reminderTitle.trim() || !reminderDueAt) return
    const res = await fetch(`/api/leads/${lead.id}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reminderTitle,
        note: reminderNote,
        dueAt: new Date(reminderDueAt).toISOString(),
      }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Reminder Failed', description: 'Could not create reminder.' })
      return
    }
    const data = await res.json()
    setReminders((prev) => [...prev, data.reminder].sort((a, b) => +new Date(a.dueAt ?? 0) - +new Date(b.dueAt ?? 0)))
    setReminderTitle('')
    setReminderNote('')
    setReminderDueAt('')
    toast({ title: 'Reminder Added', description: 'Follow-up reminder created.' })
  }

  async function completeReminder(reminderId: string) {
    const res = await fetch(`/api/leads/${lead.id}/reminders/${reminderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (!res.ok) return
    const data = await res.json()
    setReminders((prev) => prev.map((r) => (r.id === reminderId ? data.reminder : r)))
  }

  const stageLabel = STAGES.find((s) => s.value === stage)?.label ?? stage

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/admin/leads"
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            ← Back to Leads
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-2">{lead.fullName}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-md border ${STAGE_COLORS[stage]}`}>
              {stageLabel}
            </span>
            {saving && <span className="text-gray-500 text-xs">Saving...</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — lead info + pipeline */}
        <div className="col-span-2 space-y-6">

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
            </div>
            <button
              onClick={handleSaveLeadProfile}
              disabled={editingLead}
              className="mt-3 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {editingLead ? 'Saving...' : 'Save Lead Profile'}
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
              {addingNote ? 'Saving...' : 'Save'}
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
            <h2 className="text-white font-medium mb-2">Country Document Checklist</h2>
            <p className="text-xs text-gray-500 mb-4">
              {checklistProgress.done}/{checklistProgress.total} documents submitted
            </p>
            {loadingChecklist ? (
              <p className="text-sm text-gray-500">Loading checklist...</p>
            ) : (
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const isSubmitted = item.isSubmitted === 'true'
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id, !isSubmitted)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                        isSubmitted
                          ? 'border-emerald-600 bg-emerald-600/10 text-emerald-300'
                          : 'border-gray-700 text-gray-300'
                      }`}
                    >
                      {isSubmitted ? '✓' : '○'} {item.documentLabel}
                    </button>
                  )
                })}
              </div>
            )}
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
              <p className="text-sm text-gray-500">Loading reminders...</p>
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
    </div>
  )
}