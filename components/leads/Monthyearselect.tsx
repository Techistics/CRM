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
    <div className="grid grid-cols-2 gap-3">
      <Select value={month ?? 'all'} onValueChange={(val) => onMonthChange(val === 'all' ? null : val)}>
        <SelectTrigger className="w-full h-9"><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Month</SelectItem>
          {MONTH_NAMES.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year ?? 'all'} onValueChange={(val) => onYearChange(val === 'all' ? null : val)}>
        <SelectTrigger className="w-full h-9"><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Year</SelectItem>
          {yearOptions().map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}