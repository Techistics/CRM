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
  dropdownScroll: 'max-h-[168px] overflow-y-auto',
  label: 'text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide',
  trigger: 'w-full h-10 rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm',
  input: 'flex h-10 w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-300',
} as const
