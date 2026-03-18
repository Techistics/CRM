'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, LeadActivity, User, LeadStage } from '@/db/schema'

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

const ACTIVITY_ICONS: Record<string, string> = {
  stage_change: '⟳',
  note:         '✎',
  call:         '☎',
  message:      '✉',
  document:     '📄',
}

type ActivityRow = {
  id: string
  type: LeadActivity['type']
  fromStage: string | null
  toStage: string | null
  note: string | null
  createdAt: Date | null
  userName: string | null
}

type UserRow = Pick<User, 'id' | 'name' | 'role'>

export default function LeadDetailClient({
  lead,
  activities: initialActivities,
  allUsers,
}: {
  lead: Lead
  activities: ActivityRow[]
  allUsers: UserRow[]
}) {
  const router = useRouter()
  const [stage, setStage] = useState(lead.stage ?? 'new_lead')
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '')
  const [activities, setActivities] = useState(initialActivities)
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)

  const proUsers = allUsers.filter((u) => u.role === 'pro')

  async function handleStageChange(newStage: Lead['stage']) {
    setStage(newStage)
    setSaving(true)
    await fetch(`/api/leads/${lead.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    setSaving(false)
    router.refresh()
  }

  async function handleAssign(newAssignedTo: string) {
    setAssignedTo(newAssignedTo)
    await fetch(`/api/leads/${lead.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: newAssignedTo || null }),
    })
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
    router.refresh()
  }

  function formatDate(d: Date | null) {
    if (!d) return ''
    return new Date(d).toLocaleString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const stageLabel = STAGES.find((s) => s.value === stage)?.label ?? stage

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <a
            href="/admin/leads"
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            ← Back to Leads
          </a>
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
            {activities.length === 0 ? (
              <p className="text-gray-600 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <span className="text-gray-500 text-sm mt-0.5 w-4 shrink-0">
                      {ACTIVITY_ICONS[a.type ?? 'note']}
                    </span>
                    <div>
                      {a.type === 'stage_change' ? (
                        <p className="text-gray-400 text-xs">
                          <span className="text-white">{a.userName}</span>
                          {' moved to '}
                          <span className="text-emerald-400">
                            {STAGES.find((s) => s.value === a.toStage)?.label ?? a.toStage}
                          </span>
                        </p>
                      ) : (
                        <p className="text-gray-300 text-xs">{a.note}</p>
                      )}
                      <p className="text-gray-600 text-xs mt-0.5">
                        {a.userName} · {formatDate(a.createdAt)}
                      </p>
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