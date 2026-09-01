import type { PendingFilters } from '@/types/leads'

export const EMPTY_FILTERS: PendingFilters = {
  tags: [],
  stage: null,
  subStatusType: null,
  subStatusId: null,
  closedAction: null,
  heat: 'all',
  assignedTo: null,
  appUniversityName: null,
  appCourseName: null,
  appSource: null,
  appStatus: null,
  appIntakeMonth: null,
  appIntakeYear: null,
  leadIntakeMonth: null,
  leadIntakeYear: null,
  revIntakeMonth: null,
  revIntakeYear: null,
}

export const FILTER_URL_KEYS = [
  'stage', 'subStatusType', 'subStatusId', 'closedAction', 'assignedTo', 'tags', 'page',
  'appUniversityName', 'appCourseName', 'appSource', 'appStatus', 'appIntakeMonth', 'appIntakeYear',
  'leadIntakeMonth', 'leadIntakeYear', 'revIntakeMonth', 'revIntakeYear',
] as const

export const FILTER_FIELD_CLASSES = {
  dropdownScroll: 'max-h-[200px] overflow-y-auto',
  label: 'text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider',
  trigger:
    'w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 font-medium transition-all shadow-xs',
  input:
    'flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/80 px-3.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all',
} as const
