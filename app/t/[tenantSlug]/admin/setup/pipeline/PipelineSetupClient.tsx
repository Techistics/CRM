'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { getDefaultsForPosition } from '@/constants/sub-status-defaults'
import { apiCall } from '@/lib/utils/api-handler'

type StageDraft = {
  key: string
  label: string
}

function slugKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export default function PipelineSetupClient({ tenantName }: { tenantName: string }) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')

  const defaultDraft = useMemo<StageDraft[]>(
    () => PIPELINE_STAGES.map((s) => ({ key: s.value, label: s.label })),
    [],
  )

  const [mode, setMode] = useState<'default' | 'custom'>('default')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)

  const [stages, setStages] = useState<StageDraft[]>(defaultDraft)
  const [subStatusEnabled, setSubStatusEnabled] = useState(false)

  // Sub-status editor state
  const [subStatusDraft, setSubStatusDraft] = useState<
    Record<string, Array<{ id: string; label: string; type: 'in_progress' | 'closed_lost' | 'defer'; closedActions: string[] }>>
  >({})
  const [selectedStageIdx, setSelectedStageIdx] = useState(0)
  const [newClosedAction, setNewClosedAction] = useState<Record<string, string>>({})

  // When step changes to 3, populate subStatusDraft
  useEffect(() => {
    if (step !== 3) return
    const draft: typeof subStatusDraft = {}
    stages.forEach((s, idx) => {
      const defaults = getDefaultsForPosition(idx)
      draft[s.key] = defaults.map((d, i) => ({
        id: `draft_${s.key}_${i}`,
        label: d.label,
        type: d.type,
        closedActions: [...d.closedActions],
      }))
    })
    setSubStatusDraft(draft)
    setSelectedStageIdx(0)
  }, [step, stages])

  async function save() {
    setSaving(true)
    
    // 1. Save stages
    const stagesPayload = {
      stages: stages.map((s, idx) => ({ key: s.key, label: s.label, sortOrder: idx })),
    }
    const stagesOk = await apiCall(async () => {
      const res = await fetch('/api/admin/pipeline-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stagesPayload),
      })
      return res.json()
    }, { successMsg: '', errorMsg: 'Failed to save stages' })
    
    if (!stagesOk) { setSaving(false); return }

    // 2. Save sub-statuses if sub-status is enabled
    if (subStatusEnabled) {
      const allSubStatuses = Object.entries(subStatusDraft).flatMap(([stageKey, subs]) =>
        subs.map((ss, idx) => ({
          stageKey,
          label: ss.label,
          type: ss.type,
          closedActions: ss.closedActions,
          sortOrder: idx,
        }))
      )
      
      for (const ss of allSubStatuses) {
        await fetch('/api/sub-statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ss),
        })
      }
    }

    setSaving(false)
    toast.success('Pipeline setup complete!')
    router.push(`/t/${tenantSlug}/admin/overview`)
    router.refresh()
  }

  const selectedStage = stages[selectedStageIdx]
  const currentSubStatuses = selectedStage ? subStatusDraft[selectedStage.key] ?? [] : []

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[14px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-7">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[var(--text-strong)] tracking-tight">
            Setup your pipeline
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted-text)]">
            {tenantName}: define stages and what can happen simultaneously.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2 text-[12px] text-[var(--muted-text)]">
          <span className={step === 1 ? 'text-[var(--text-strong)] font-medium' : ''}>1. Mode</span>
          <span>→</span>
          <span className={step === 2 ? 'text-[var(--text-strong)] font-medium' : ''}>2. Stages</span>
          <span>→</span>
          <span className={step === 3 ? 'text-[var(--text-strong)] font-medium' : ''}>3. Sub-Statuses</span>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setMode('default')
                setStages(defaultDraft)
              }}
              className={`w-full rounded-[12px] border px-4 py-3 text-left transition-colors ${
                mode === 'default'
                  ? 'border-[#CBEF7F]/40 bg-[#CBEF7F]/10'
                  : 'border-[var(--card-border-color)] hover:bg-[var(--main-bg)]'
              }`}
            >
              <div className="text-[14px] font-medium text-[var(--text-strong)]">Use existing stages</div>
              <div className="mt-0.5 text-[12px] text-[var(--muted-text)]">
                Start with the default pipeline; you can tweak it next.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('custom')
                setStages([{ key: 'new_lead', label: 'New Lead' }])
              }}
              className={`w-full rounded-[12px] border px-4 py-3 text-left transition-colors ${
                mode === 'custom'
                  ? 'border-[#CBEF7F]/40 bg-[#CBEF7F]/10'
                  : 'border-[var(--card-border-color)] hover:bg-[var(--main-bg)]'
              }`}
            >
              <div className="text-[14px] font-medium text-[var(--text-strong)]">Create custom stages</div>
              <div className="mt-0.5 text-[12px] text-[var(--muted-text)]">
                Build your own pipeline from scratch (ordered).
              </div>
            </button>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-10 rounded-[10px] bg-[#CBEF7F] px-4 text-[13px] font-medium text-[#2C5000]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              {stages.map((s, idx) => (
                <div
                  key={`${s.key}-${idx}`}
                  className="flex items-center gap-2 rounded-[12px] border border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 py-2"
                >
                  <input
                    value={s.label}
                    onChange={(e) => {
                      const label = e.target.value
                      setStages((prev) => prev.map((x, i) => (i === idx ? { ...x, label } : x)))
                    }}
                    className="h-9 flex-1 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none"
                  />
                  <input
                    value={s.key}
                    onChange={(e) => {
                      const key = slugKey(e.target.value)
                      setStages((prev) => prev.map((x, i) => (i === idx ? { ...x, key } : x)))
                    }}
                    className="h-9 w-[170px] rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-3 text-[12px] text-[var(--muted-text)] outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setStages((prev) => {
                          if (idx === 0) return prev
                          const next = [...prev]
                          ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                          return next
                        })
                      }
                      className="h-9 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-2 text-[12px] text-[var(--muted-text)] hover:bg-[var(--main-bg)]"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStages((prev) => {
                          if (idx === prev.length - 1) return prev
                          const next = [...prev]
                          ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                          return next
                        })
                      }
                      className="h-9 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-2 text-[12px] text-[var(--muted-text)] hover:bg-[var(--main-bg)]"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStages((prev) => prev.filter((_, i) => i !== idx))
                      }}
                      className="h-9 rounded-[10px] border border-red-500/30 bg-red-500/10 px-2 text-[12px] text-red-300 hover:bg-red-500/15"
                      disabled={stages.length <= 1}
                      title={stages.length <= 1 ? 'At least one stage required' : 'Remove'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() =>
                  setStages((prev) => [...prev, { key: slugKey(`stage_${prev.length + 1}`), label: 'New Stage' }])
                }
                className="h-10 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 text-[13px] text-[var(--text-strong)] hover:bg-[var(--main-bg)]"
              >
                Add stage
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 text-[13px] text-[var(--text-strong)] hover:bg-[var(--main-bg)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-10 rounded-[10px] bg-[#CBEF7F] px-4 text-[13px] font-medium text-[#2C5000]"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--card-border-color)] bg-[var(--main-bg)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[14px] font-medium text-[var(--text-strong)]">Enable Sub-Statuses</div>
                  <div className="mt-0.5 text-[12px] text-[var(--muted-text)]">
                    Track where each lead is within a stage (e.g. In Progress, Closed Lost). You can always configure this later in Settings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubStatusEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    subStatusEnabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    subStatusEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {subStatusEnabled && (
                <div className="grid grid-cols-3 gap-4 border-t border-[var(--card-border-color)] pt-4">
                  <div className="col-span-1 space-y-1">
                    {stages.map((stage, idx) => {
                      const isSelected = selectedStageIdx === idx
                      return (
                        <div
                          key={stage.key}
                          onClick={() => setSelectedStageIdx(idx)}
                          className={`rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-400'
                              : 'hover:bg-slate-50 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-400 border border-transparent'
                          }`}
                        >
                          {stage.label}
                        </div>
                      )
                    })}
                  </div>

                  <div className="col-span-2 bg-[var(--main-bg)] rounded-[12px] border border-[var(--card-border-color)] p-4">
                    <h3 className="text-sm font-medium text-[var(--text-strong)] mb-4">
                      Sub-statuses for {selectedStage?.label}
                    </h3>
                    
                    <div className="space-y-3">
                      {currentSubStatuses.map((ss, ssIdx) => (
                        <div key={ss.id} className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--card-border-color)] p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={ss.label}
                              onChange={(e) => {
                                setSubStatusDraft(prev => {
                                  const next = { ...prev }
                                  next[selectedStage.key][ssIdx].label = e.target.value
                                  return next
                                })
                              }}
                              className="flex-1 h-8 rounded-md border border-[var(--card-border-color)] bg-[var(--main-bg)] px-2 text-sm text-[var(--text-strong)] outline-none"
                              placeholder="Sub-status label"
                            />
                            <button
                              onClick={() => {
                                setSubStatusDraft(prev => {
                                  const next = { ...prev }
                                  next[selectedStage.key] = next[selectedStage.key].filter((_, i) => i !== ssIdx)
                                  return next
                                })
                              }}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex gap-2">
                            {(['in_progress', 'closed_lost', 'defer'] as const).map(type => (
                              <button
                                key={type}
                                onClick={() => {
                                  setSubStatusDraft(prev => {
                                    const next = { ...prev }
                                    next[selectedStage.key][ssIdx].type = type
                                    return next
                                  })
                                }}
                                className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                                  ss.type === type
                                    ? type === 'in_progress' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'
                                    : type === 'closed_lost' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                    : 'bg-[var(--main-bg)] text-[var(--muted-text)] hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {type.replace('_', ' ')}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-[var(--card-border-color)]">
                            <div className="text-[11px] text-[var(--muted-text)] font-medium">Closed Actions</div>
                            <div className="flex flex-wrap gap-1.5">
                              {ss.closedActions.map((action, actionIdx) => (
                                <span key={actionIdx} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-md px-2 py-0.5 text-[11px] text-[var(--text-strong)]">
                                  {action}
                                  <button
                                    onClick={() => {
                                      setSubStatusDraft(prev => {
                                        const next = { ...prev }
                                        next[selectedStage.key][ssIdx].closedActions = next[selectedStage.key][ssIdx].closedActions.filter((_, i) => i !== actionIdx)
                                        return next
                                      })
                                    }}
                                    className="hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                value={newClosedAction[ss.id] || ''}
                                onChange={(e) => setNewClosedAction(prev => ({ ...prev, [ss.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const action = newClosedAction[ss.id]?.trim()
                                    if (action && !ss.closedActions.includes(action)) {
                                      setSubStatusDraft(prev => {
                                        const next = { ...prev }
                                        next[selectedStage.key][ssIdx].closedActions.push(action)
                                        return next
                                      })
                                      setNewClosedAction(prev => ({ ...prev, [ss.id]: '' }))
                                    }
                                  }
                                }}
                                className="flex-1 h-7 rounded-md border border-[var(--card-border-color)] bg-[var(--main-bg)] px-2 text-[11px] text-[var(--text-strong)] outline-none"
                                placeholder="New action..."
                              />
                              <button
                                onClick={() => {
                                  const action = newClosedAction[ss.id]?.trim()
                                  if (action && !ss.closedActions.includes(action)) {
                                    setSubStatusDraft(prev => {
                                      const next = { ...prev }
                                      next[selectedStage.key][ssIdx].closedActions.push(action)
                                      return next
                                    })
                                    setNewClosedAction(prev => ({ ...prev, [ss.id]: '' }))
                                  }
                                }}
                                className="h-7 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-strong)] rounded-md text-[11px] font-medium transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setSubStatusDraft(prev => {
                          const next = { ...prev }
                          next[selectedStage.key] = [
                            ...(next[selectedStage.key] || []),
                            { id: `draft_${Date.now()}`, label: 'New Sub-Status', type: 'in_progress', closedActions: [] }
                          ]
                          return next
                        })
                      }}
                      className="mt-3 flex items-center gap-1.5 text-[12px] text-sky-600 dark:text-sky-400 font-medium hover:text-sky-700 dark:hover:text-sky-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Sub-Status
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-10 rounded-[10px] border border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 text-[13px] text-[var(--text-strong)] hover:bg-[var(--main-bg)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-10 rounded-[10px] bg-[#CBEF7F] px-4 text-[13px] font-medium text-[#2C5000] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
