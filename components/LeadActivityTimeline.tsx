import type { LeadActivity } from '@/types/models'
import { Check } from 'lucide-react'
import { leadStageLabel } from '@/lib/lead-stage-labels'

import type { TimelineActivity } from '@/types/leads'

const ICONS: Record<string, string> = {
  stage_change: '⟳',
  note: '✎',
  call: '☎',
  message: '✉',
  document: '📄',
}

function formatTimelineDate(d: Date | string | null | undefined): string {
  if (d == null) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function activityKindLabel(type: LeadActivity['type']): string {
  switch (type) {
    case 'stage_change':
      return 'Stage change'
    case 'call':
      return 'Call'
    case 'message':
      return 'Message'
    case 'document':
      return 'Document'
    default:
      return 'Note'
  }
}

export default function LeadActivityTimeline({
  activities,
  stageLabels,
}: {
  activities: TimelineActivity[]
  stageLabels?: Record<string, string>
}) {
  if (activities.length === 0) {
    return <p className="text-slate-500 text-sm">No activity yet.</p>
  }

  const label = (value: string | null | undefined) => {
    if (!value) return leadStageLabel(value)
    return stageLabels?.[value] ?? leadStageLabel(value)
  }

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-200" aria-hidden />
      <ul className="space-y-0 list-none m-0 p-0">
        {activities.map((a) => {
          const icon = ICONS[a.type ?? 'note'] ?? '✎'
          const name = a.userName?.trim() || null
          const email = a.userEmail?.trim() || null

          return (
            <li key={a.id} className="relative flex gap-4 pb-8 last:pb-0">
              <div
                className="relative mt-1 flex h-7 w-5 shrink-0 flex-col items-center"
                aria-hidden
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-white border border-emerald-200">
                  <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                </div>
                <span className="mt-1 text-[12px] leading-none text-gray-500">{icon}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {activityKindLabel(a.type)}
                </p>
                {a.type === 'stage_change' ? (
                  <p className="text-sm text-slate-700">
                    <span className="text-slate-500">From </span>
                    <span className="font-medium text-slate-900">
                      {label(a.fromStage)}
                    </span>
                    <span className="text-slate-500"> to </span>
                    <span className="font-medium text-emerald-600">
                      {label(a.toStage)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                    {a.note?.trim() || '—'}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">Updated by </span>
                  <span className="font-medium text-slate-700">{name ?? 'Unknown'}</span>
                  {email ? (
                    <>
                      <span className="text-slate-300"> · </span>
                      <span className="break-all text-slate-500">{email}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-2">
                  {formatTimelineDate(a.createdAt)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
