import type { LeadActivity } from '@/db/schema'
import { leadStageLabel } from '@/lib/lead-stage-labels'

export type TimelineActivity = {
  id: string
  type: LeadActivity['type']
  fromStage: string | null
  toStage: string | null
  note: string | null
  createdAt: Date | string | null
  userName: string | null
  userEmail: string | null
}

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
}: {
  activities: TimelineActivity[]
}) {
  if (activities.length === 0) {
    return <p className="text-gray-600 text-sm">No activity yet.</p>
  }

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-700" aria-hidden />
      <ul className="space-y-0 list-none m-0 p-0">
        {activities.map((a) => {
          const icon = ICONS[a.type ?? 'note'] ?? '✎'
          const name = a.userName?.trim() || null
          const email = a.userEmail?.trim() || null

          return (
            <li key={a.id} className="relative flex gap-4 pb-8 last:pb-0">
              <div
                className="relative mt-1.5 flex h-7 w-4 shrink-0 flex-col items-center"
                aria-hidden
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-gray-900" />
                <span className="mt-1 text-[12px] leading-none text-gray-500">{icon}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {activityKindLabel(a.type)}
                </p>
                {a.type === 'stage_change' ? (
                  <p className="text-sm text-gray-200">
                    <span className="text-gray-400">From </span>
                    <span className="font-medium text-white">
                      {leadStageLabel(a.fromStage)}
                    </span>
                    <span className="text-gray-400"> to </span>
                    <span className="font-medium text-emerald-400">
                      {leadStageLabel(a.toStage)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                    {a.note?.trim() || '—'}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  <span className="text-gray-500">Updated by </span>
                  <span className="font-medium text-gray-300">{name ?? 'Unknown'}</span>
                  {email ? (
                    <>
                      <span className="text-gray-600"> · </span>
                      <span className="break-all text-gray-500">{email}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500 border-t border-gray-800/80 pt-2 mt-2">
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
