'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MONTH_NAMES, yearOptions } from '@/types/LeadsDashboard'

export function MonthYearSelect({
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  month: string | null
  year: string | null
  onMonthChange: (v: string | null) => void
  onYearChange: (v: string | null) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Select value={month ?? 'all'} onValueChange={(val) => onMonthChange(val === 'all' ? null : val)}>
        <SelectTrigger className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm font-medium">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Month</SelectItem>
          {MONTH_NAMES.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year ?? 'all'} onValueChange={(val) => onYearChange(val === 'all' ? null : val)}>
        <SelectTrigger className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm font-medium">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Year</SelectItem>
          {yearOptions().map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}