'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Filter, RotateCcw } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagFilter } from '@/components/leads/TagFilter'
import { MonthYearSelect } from '@/components/leads/Monthyearselect'
import { cn } from '@/lib/utils'
import {
  Agent,
  SubStatusRow,
  SubStatusType,
  SUB_STATUS_TYPE_OPTIONS,
  buildSubStatusOptions,
} from '@/types/LeadsDashboard'
import type { PendingFilters, FilterSheetProps } from '@/types/leads'
import {
  EMPTY_FILTERS,
  FILTER_URL_KEYS,
  FILTER_FIELD_CLASSES,
} from '@/constants/leads'

const DROPDOWN_SCROLL_CLASS = FILTER_FIELD_CLASSES.dropdownScroll
const FIELD_LABEL_CLASS = FILTER_FIELD_CLASSES.label
const FIELD_TRIGGER_CLASS = FILTER_FIELD_CLASSES.trigger
const FIELD_INPUT_CLASS = FILTER_FIELD_CLASSES.input

export function FilterSheet({
  tenantStages,
  agents,
  isAdmin,
  heatFilter,
  onHeatFilterChange,
  activeFilterCount,
}: FilterSheetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [subStatuses, setSubStatuses] = useState<SubStatusRow[]>([])
  const [subStatusesLoading, setSubStatusesLoading] = useState(false)

  const buildInitialFilters = useCallback((): PendingFilters => ({
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
    stage: searchParams.get('stage'),
    subStatusType: searchParams.get('subStatusType') as SubStatusType | null,
    subStatusId: searchParams.get('subStatusId'),
    closedAction: searchParams.get('closedAction'),
    heat: heatFilter,
    assignedTo: searchParams.get('assignedTo'),
    appUniversityName: searchParams.get('appUniversityName'),
    appCourseName: searchParams.get('appCourseName'),
    appSource: searchParams.get('appSource'),
    appStatus: searchParams.get('appStatus'),
    appIntakeMonth: searchParams.get('appIntakeMonth'),
    appIntakeYear: searchParams.get('appIntakeYear'),
    leadIntakeMonth: searchParams.get('leadIntakeMonth'),
    leadIntakeYear: searchParams.get('leadIntakeYear'),
    revIntakeMonth: searchParams.get('revIntakeMonth'),
    revIntakeYear: searchParams.get('revIntakeYear'),
  }), [searchParams, heatFilter])

  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(buildInitialFilters)

  useEffect(() => {
    if (isOpen) setPendingFilters(buildInitialFilters())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    const stageKey = pendingFilters.stage
    if (!stageKey) {
      setSubStatuses([])
      return
    }
    setSubStatusesLoading(true)
    fetch(`/api/sub-statuses?stageKey=${encodeURIComponent(stageKey)}`)
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data?.data ?? [])
        setSubStatuses(rows.map((r: any) => ({
          id: r.id,
          stageKey: r.stageKey,
          label: r.label,
          type: r.type,
          closedActions: Array.isArray(r.closedActions) ? r.closedActions : [],
        })))
      })
      .catch(() => setSubStatuses([]))
      .finally(() => setSubStatusesLoading(false))
  }, [pendingFilters.stage])

  const subStatusOptions = useMemo(
    () => buildSubStatusOptions(subStatuses, pendingFilters.subStatusType),
    [subStatuses, pendingFilters.subStatusType],
  )

  const selectedSubStatusOptionValue = pendingFilters.closedAction
    ? `${pendingFilters.subStatusId}::${pendingFilters.closedAction}`
    : pendingFilters.subStatusId

  const patch = (fields: Partial<PendingFilters>) =>
    setPendingFilters((p) => ({ ...p, ...fields }))

  const handleApplyFilters = () => {
    const sp = new URLSearchParams(searchParams.toString())
    const setOrDelete = (key: string, value: string | null | undefined) => {
      if (value) sp.set(key, value)
      else sp.delete(key)
    }

    setOrDelete('tags', pendingFilters.tags.length > 0 ? pendingFilters.tags.join(',') : null)
    setOrDelete('stage', pendingFilters.stage && pendingFilters.stage !== 'all' ? pendingFilters.stage : null)
    setOrDelete('subStatusType', pendingFilters.stage ? pendingFilters.subStatusType : null)
    setOrDelete('subStatusId', pendingFilters.stage && pendingFilters.subStatusType ? pendingFilters.subStatusId : null)
    setOrDelete('closedAction', pendingFilters.closedAction)
    setOrDelete('assignedTo', pendingFilters.assignedTo && pendingFilters.assignedTo !== 'all' ? pendingFilters.assignedTo : null)
    setOrDelete('appUniversityName', pendingFilters.appUniversityName)
    setOrDelete('appCourseName', pendingFilters.appCourseName)
    setOrDelete('appSource', pendingFilters.appSource && pendingFilters.appSource !== 'all' ? pendingFilters.appSource : null)

    if (pendingFilters.appStatus && pendingFilters.appStatus !== 'all') {
      sp.set('appStatus', pendingFilters.appStatus)
    } else {
      sp.delete('appStatus')
    }
    setOrDelete('appIntakeMonth', pendingFilters.appIntakeMonth)
    setOrDelete('appIntakeYear', pendingFilters.appIntakeYear)

    setOrDelete('leadIntakeMonth', pendingFilters.leadIntakeMonth)
    setOrDelete('leadIntakeYear', pendingFilters.leadIntakeYear)
    setOrDelete('revIntakeMonth', pendingFilters.revIntakeMonth)
    setOrDelete('revIntakeYear', pendingFilters.revIntakeYear)

    sp.delete('page')
    onHeatFilterChange(pendingFilters.heat ?? 'all')
    router.push('?' + sp.toString())
    setIsOpen(false)
  }

  const handleClearAll = () => {
    setPendingFilters({ ...EMPTY_FILTERS })
    onHeatFilterChange('all')
    const sp = new URLSearchParams(searchParams.toString())
    FILTER_URL_KEYS.forEach((k) => sp.delete(k))
    router.push(`?${sp.toString()}`)
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 shrink-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-full px-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs">
          <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 border-l border-slate-200 dark:border-slate-800 overflow-hidden gap-0 bg-white dark:bg-slate-900 shadow-2xl">
        <SheetHeader className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 pr-12 space-y-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Filters</SheetTitle>
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Reset all filters"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Pipeline & Stage */}
          <div className="space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pipeline & Stage</p>
            
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Pipeline Stage</Label>
              <Select
                value={pendingFilters.stage ?? 'all'}
                onValueChange={(val) => patch({
                  stage: val === 'all' ? null : val,
                  subStatusType: null,
                  subStatusId: null,
                  closedAction: null,
                })}
              >
                <SelectTrigger className={FIELD_TRIGGER_CLASS}><SelectValue placeholder="Any Stage" /></SelectTrigger>
                <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                  <SelectItem value="all">Any Stage</SelectItem>
                  {tenantStages.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pendingFilters.stage && (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLASS}>Status Type</Label>
                <div className="flex gap-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700/60">
                  {SUB_STATUS_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patch({
                        subStatusType: pendingFilters.subStatusType === opt.value ? null : opt.value,
                        subStatusId: null,
                        closedAction: null,
                      })}
                      className={cn(
                        'flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all',
                        pendingFilters.subStatusType === opt.value
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pendingFilters.stage && pendingFilters.subStatusType && (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLASS}>Sub-Status</Label>
                <Select
                  value={selectedSubStatusOptionValue ?? 'all'}
                  onValueChange={(val) => {
                    if (val === 'all') {
                      patch({ subStatusId: null, closedAction: null })
                      return
                    }
                    const opt = subStatusOptions.find((o) => o.value === val)
                    patch({ subStatusId: opt?.subStatusId ?? null, closedAction: opt?.closedAction ?? null })
                  }}
                  disabled={subStatusesLoading}
                >
                  <SelectTrigger className={FIELD_TRIGGER_CLASS}>
                    <SelectValue placeholder={subStatusesLoading ? 'Loading…' : 'Any Sub-Status'} />
                  </SelectTrigger>
                  <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                    <SelectItem value="all">Any Sub-Status</SelectItem>
                    {subStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!subStatusesLoading && subStatusOptions.length === 0 && (
                  <p className="text-[11px] text-slate-400">No sub-statuses of this type for this stage.</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Heat</Label>
              <Select value={pendingFilters.heat ?? 'all'} onValueChange={(val) => patch({ heat: val })}>
                <SelectTrigger className={FIELD_TRIGGER_CLASS}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && agents.length > 0 && (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLASS}>Assigned Counselor</Label>
                <Select
                  value={pendingFilters.assignedTo ?? 'all'}
                  onValueChange={(val) => patch({ assignedTo: val === 'all' ? null : val })}
                >
                  <SelectTrigger className={FIELD_TRIGGER_CLASS}><SelectValue placeholder="Any Team Member" /></SelectTrigger>
                  <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                    <SelectItem value="all">Any Team Member</SelectItem>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Unassigned</span>
                      </div>
                    </SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.userId} value={agent.userId}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Intake & Dates */}
          <div className="space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Intake & Date Ranges</p>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Lead Intake</Label>
              <MonthYearSelect
                month={pendingFilters.leadIntakeMonth}
                year={pendingFilters.leadIntakeYear}
                onMonthChange={(v) => patch({ leadIntakeMonth: v })}
                onYearChange={(v) => patch({ leadIntakeYear: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Revenue Intake</Label>
              <MonthYearSelect
                month={pendingFilters.revIntakeMonth}
                year={pendingFilters.revIntakeYear}
                onMonthChange={(v) => patch({ revIntakeMonth: v })}
                onYearChange={(v) => patch({ revIntakeYear: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>App Intake</Label>
              <MonthYearSelect
                month={pendingFilters.appIntakeMonth}
                year={pendingFilters.appIntakeYear}
                onMonthChange={(v) => patch({ appIntakeMonth: v })}
                onYearChange={(v) => patch({ appIntakeYear: v })}
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Application Details & Tags */}
          <div className="space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Application & Tags</p>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>University Name</Label>
              <input
                value={pendingFilters.appUniversityName ?? ''}
                onChange={(e) => patch({ appUniversityName: e.target.value || null })}
                placeholder="University name..."
                className={FIELD_INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Course Name</Label>
              <input
                value={pendingFilters.appCourseName ?? ''}
                onChange={(e) => patch({ appCourseName: e.target.value || null })}
                placeholder="Course name..."
                className={FIELD_INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Application Source</Label>
              <Select
                value={pendingFilters.appSource ?? 'all'}
                onValueChange={(val) => patch({ appSource: val === 'all' ? null : val })}
              >
                <SelectTrigger className={FIELD_TRIGGER_CLASS}><SelectValue placeholder="Any Source" /></SelectTrigger>
                <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                  <SelectItem value="all">Any Source</SelectItem>
                  <SelectItem value="direct_uni">Direct University</SelectItem>
                  <SelectItem value="partner_portal">Partner Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Application Status</Label>
              <Select
                value={pendingFilters.appStatus ?? 'all'}
                onValueChange={(val) => patch({ appStatus: val === 'all' ? null : val })}
              >
                <SelectTrigger className={FIELD_TRIGGER_CLASS}><SelectValue placeholder="Any Status" /></SelectTrigger>
                <SelectContent className={DROPDOWN_SCROLL_CLASS}>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="tag">Tag</SelectItem>
                  <SelectItem value="new_application">New Application</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLASS}>Tags</Label>
              <TagFilter value={pendingFilters.tags} onChange={(tags) => patch({ tags })} />
            </div>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex-row gap-3 sm:space-x-0 bg-slate-50/80 dark:bg-slate-900/80">
          <Button onClick={handleApplyFilters} className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold shadow-xs transition-all">
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleClearAll}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
          >
            Clear All
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}