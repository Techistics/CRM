'use client'

import { useState } from 'react'
import { Loader2, Plus, Edit2, Trash2, Check, X, Layers } from 'lucide-react'
import { apiCall } from '@/lib/utils/api-handler'
import SubStatusCustomFieldEditor, {
  type CustomFieldDraft,
} from '@/components/pipeline/SubStatusCustomFieldEditor'
import {
  customFieldsToDraft,
  normalizeCustomFields,
} from '@/lib/pipeline/sub-status-fields'

type SubStatus = {
  id: string
  stageKey: string
  label: string
  type: 'in_progress' | 'closed_lost' | 'defer'
  closedActions: unknown
  customFieldsEnabled?: boolean
  customFields?: unknown
  sortOrder: number
}

const TYPE_BADGE: Record<string, string> = {
  in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  closed_lost: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  defer: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

const TYPE_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  closed_lost: 'Closed Lost',
  defer: 'Defer',
}

const emptyFieldDraft = (): CustomFieldDraft => ({
  label: '',
  type: 'select',
  optionsText: '',
})

function resetFormState(setters: {
  setFormLabel: (v: string) => void
  setFormType: (v: 'in_progress' | 'closed_lost' | 'defer') => void
  setFormActions: (v: string) => void
  setFormCustomFieldsEnabled: (v: boolean) => void
  setFormCustomFieldsDraft: (v: CustomFieldDraft[]) => void
}) {
  setters.setFormLabel('')
  setters.setFormType('in_progress')
  setters.setFormActions('')
  setters.setFormCustomFieldsEnabled(false)
  setters.setFormCustomFieldsDraft([])
}

export default function SubStatusSettingsClient({
  initialSubStatuses,
  tenantStages,
}: {
  initialSubStatuses: SubStatus[]
  tenantStages: { key: string; label: string; sortOrder: number }[]
}) {
  const [subStatuses, setSubStatuses] = useState<SubStatus[]>(initialSubStatuses)
  const [seeding, setSeeding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingStage, setAddingStage] = useState<string | null>(null)

  const [formLabel, setFormLabel] = useState('')
  const [formType, setFormType] = useState<'in_progress' | 'closed_lost' | 'defer'>('in_progress')
  const [formActions, setFormActions] = useState('')
  const [formCustomFieldsEnabled, setFormCustomFieldsEnabled] = useState(false)
  const [formCustomFieldsDraft, setFormCustomFieldsDraft] = useState<CustomFieldDraft[]>([])

  const refresh = async () => {
    const res = await fetch('/api/sub-statuses')
    const data = await res.json()
    setSubStatuses(Array.isArray(data) ? data : [])
  }

  const handleSeed = async () => {
    setSeeding(true)
    const res = await fetch('/api/sub-statuses/seed', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    if (data.skipped) {
      alert('Sub-statuses already seeded.')
      return
    }
    await refresh()
  }

  const buildPayload = (stageKey: string, sortOrder: number) => ({
    stageKey,
    label: formLabel.trim(),
    type: formType,
    closedActions: formActions.split(',').map((a) => a.trim()).filter(Boolean),
    sortOrder,
    customFieldsEnabled: formCustomFieldsEnabled,
    customFieldsDraft: formCustomFieldsEnabled ? formCustomFieldsDraft : [],
  })

  const handleAdd = async (stageKey: string) => {
    if (!formLabel.trim()) return
    await apiCall(async () => {
      const res = await fetch('/api/sub-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildPayload(stageKey, subStatuses.filter((s) => s.stageKey === stageKey).length),
        ),
      })
      return res.json()
    }, { successMsg: 'Sub-status added', errorMsg: 'Failed to add' })
    setAddingStage(null)
    resetFormState({
      setFormLabel,
      setFormType,
      setFormActions,
      setFormCustomFieldsEnabled,
      setFormCustomFieldsDraft,
    })
    await refresh()
  }

  const handleEdit = async (id: string) => {
    await apiCall(async () => {
      const res = await fetch('/api/sub-statuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          label: formLabel.trim(),
          type: formType,
          closedActions: formActions.split(',').map((a) => a.trim()).filter(Boolean),
          customFieldsEnabled: formCustomFieldsEnabled,
          customFieldsDraft: formCustomFieldsEnabled ? formCustomFieldsDraft : [],
        }),
      })
      return res.json()
    }, { successMsg: 'Updated', errorMsg: 'Failed to update' })
    setEditingId(null)
    resetFormState({
      setFormLabel,
      setFormType,
      setFormActions,
      setFormCustomFieldsEnabled,
      setFormCustomFieldsDraft,
    })
    await refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sub-status?')) return
    await apiCall(async () => {
      const res = await fetch('/api/sub-statuses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      return res.json()
    }, { successMsg: 'Deleted', errorMsg: 'Failed to delete' })
    await refresh()
  }

  const startEdit = (ss: SubStatus) => {
    setEditingId(ss.id)
    setFormLabel(ss.label)
    setFormType(ss.type)
    setFormActions(Array.isArray(ss.closedActions) ? (ss.closedActions as string[]).join(', ') : '')
    setFormCustomFieldsEnabled(Boolean(ss.customFieldsEnabled))
    setFormCustomFieldsDraft(
      ss.customFieldsEnabled
        ? customFieldsToDraft(normalizeCustomFields(ss.customFields))
        : [],
    )
  }

  const startAdd = (stageKey: string) => {
    setAddingStage(stageKey)
    resetFormState({
      setFormLabel,
      setFormType,
      setFormActions,
      setFormCustomFieldsEnabled,
      setFormCustomFieldsDraft,
    })
  }

  const grouped = tenantStages.reduce((acc, s) => {
    acc[s.key] = subStatuses.filter((ss) => ss.stageKey === s.key)
    return acc
  }, {} as Record<string, SubStatus[]>)

  const hasAny = subStatuses.length > 0

  const renderForm = (onSave: () => void, onCancel: () => void, autoFocus = false) => (
    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
      <input
        value={formLabel}
        onChange={(e) => setFormLabel(e.target.value)}
        placeholder="Label"
        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        autoFocus={autoFocus}
      />
      <select
        value={formType}
        onChange={(e) => setFormType(e.target.value as SubStatus['type'])}
        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
      >
        <option value="in_progress">In Progress</option>
        <option value="closed_lost">Closed Lost</option>
        <option value="defer">Defer</option>
      </select>
      <input
        value={formActions}
        onChange={(e) => setFormActions(e.target.value)}
        placeholder="Closed actions (comma separated)"
        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
      />
      <SubStatusCustomFieldEditor
        enabled={formCustomFieldsEnabled}
        onEnabledChange={(enabled) => {
          setFormCustomFieldsEnabled(enabled)
          if (enabled && formCustomFieldsDraft.length === 0) {
            setFormCustomFieldsDraft([emptyFieldDraft()])
          }
        }}
        fields={formCustomFieldsDraft}
        onFieldsChange={setFormCustomFieldsDraft}
      />
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium rounded-lg">
          <Check className="h-3.5 w-3.5" /> Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sub Statuses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure sub-statuses, closed actions, and optional custom fields per pipeline stage.
          </p>
        </div>
        {!hasAny && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            Seed Defaults
          </button>
        )}
      </div>

      {tenantStages.map((stage) => {
        const items = grouped[stage.key] ?? []
        const isAdding = addingStage === stage.key

        return (
          <div key={stage.key} className="bg-white border border-slate-200 rounded-xl shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stage.label}</h2>
              <button
                onClick={() => startAdd(stage.key)}
                className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div className="p-5 space-y-3">
              {items.length === 0 && !isAdding && (
                <p className="text-sm text-slate-400">No sub-statuses yet.</p>
              )}

              {items.map((ss) => (
                <div key={ss.id}>
                  {editingId === ss.id ? (
                    renderForm(
                      () => handleEdit(ss.id),
                      () => {
                        setEditingId(null)
                        resetFormState({
                          setFormLabel,
                          setFormType,
                          setFormActions,
                          setFormCustomFieldsEnabled,
                          setFormCustomFieldsDraft,
                        })
                      },
                    )
                  ) : (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[ss.type]}`}>
                          {TYPE_LABEL[ss.type]}
                        </span>
                        <span className="text-sm text-slate-900 dark:text-slate-100">{ss.label}</span>
                        <span className="text-xs text-slate-400">
                          {Array.isArray(ss.closedActions) ? `${(ss.closedActions as string[]).length} actions` : '0 actions'}
                        </span>
                        {ss.customFieldsEnabled && (
                          <span className="text-xs text-violet-600 dark:text-violet-400">
                            {normalizeCustomFields(ss.customFields).length} custom fields
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(ss)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(ss.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAdding && renderForm(
                () => handleAdd(stage.key),
                () => setAddingStage(null),
                true,
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
