'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
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
  const [allowedPairs, setAllowedPairs] = useState<Set<string>>(new Set())

  function togglePair(a: string, b: string) {
    const k = a < b ? `${a}__${b}` : `${b}__${a}`
    setAllowedPairs((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const payload = {
      stages: stages.map((s, idx) => ({
        key: s.key,
        label: s.label,
        sortOrder: idx,
      })),
      allowedPairs: [...allowedPairs].map((k) => k.split('__') as [string, string]),
    }

    const ok = await apiCall(async () => {
      const res = await fetch('/api/admin/pipeline-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return res.json()
    }, { successMsg: 'Pipeline saved', errorMsg: 'Failed to save pipeline' })

    setSaving(false)
    if (!ok) return
    router.push(`/t/${tenantSlug}/admin/overview`)
    router.refresh()
  }

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
          <span className={step === 3 ? 'text-[var(--text-strong)] font-medium' : ''}>3. Co-occur</span>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setMode('default')
                setStages(defaultDraft)
                setAllowedPairs(new Set())
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
                setAllowedPairs(new Set())
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
                        setAllowedPairs(new Set())
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
            <div className="rounded-[12px] border border-[var(--card-border-color)] bg-[var(--main-bg)] p-4">
              <div className="text-[13px] font-medium text-[var(--text-strong)]">Simultaneous stages</div>
              <div className="mt-1 text-[12px] text-[var(--muted-text)]">
                Check the pairs that are allowed to be active at the same time.
              </div>

              <div className="mt-6">
                {stages.length < 2 ? (
                  <div className="text-[12px] text-[var(--muted-text)]">Add at least 2 stages to configure this.</div>
                ) : (
                  <div className="space-y-6">
                    {stages.map((stage) => (
                      <div key={stage.key} className="space-y-3">
                        <div className="text-[13px] font-semibold text-[var(--text-strong)] border-b border-[var(--card-border-color)] pb-1">
                          {stage.label} <span className="font-normal text-[var(--muted-text)] text-[12px]">can co-occur with:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {stages
                            .filter((s) => s.key !== stage.key)
                            .map((other) => {
                              const k =
                                stage.key < other.key
                                  ? `${stage.key}__${other.key}`
                                  : `${other.key}__${stage.key}`
                              const checked = allowedPairs.has(k)
                              return (
                                <button
                                  key={other.key}
                                  type="button"
                                  onClick={() => togglePair(stage.key, other.key)}
                                  className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                                    checked
                                      ? 'bg-[#1e293b] text-white border border-[#334155]'
                                      : 'bg-[var(--card-bg)] text-[var(--muted-text)] border border-[var(--card-border-color)] hover:bg-[var(--card-border-color)]/20'
                                  }`}
                                >
                                  {checked && <span className="text-[10px] font-bold text-blue-400">✓</span>}
                                  {other.label}
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

