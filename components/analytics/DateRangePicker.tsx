'use client'

import { Input } from '@/components/ui/input'

import { Calendar as CalendarIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DateRange {
  from: Date | null
  to: Date | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const thisWeek = (): DateRange => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { from: monday, to: end }
  }

  const thisMonth = (): DateRange => {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { from: start, to: end }
  }

  const thisYear = (): DateRange => {
    const start = new Date()
    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return { from: start, to: end }
  }

  const presets = [
    { label: 'This Week', value: 'week', getValue: thisWeek },
    { label: 'This Month', value: 'month', getValue: thisMonth },
    { label: 'This Year', value: 'year', getValue: thisYear },
    { label: 'All Time', value: 'all', getValue: () => ({ from: null, to: null }) },
  ]

  const getCurrentPreset = () => {
    const fromStr = value.from?.toISOString().split('T')[0]
    const toStr = value.to?.toISOString().split('T')[0]

    for (const p of presets) {
      const pRange = p.getValue()
      const pFromStr = pRange.from?.toISOString().split('T')[0]
      const pToStr = pRange.to?.toISOString().split('T')[0]
      if (fromStr === pFromStr && toStr === pToStr) return p.value
    }
    return 'custom'
  }

  return (
    <div className="flex items-center gap-2 h-9 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
        <span>Range</span>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      <Select 
        value={getCurrentPreset()} 
        onValueChange={(val) => {
          const p = presets.find(x => x.value === val)
          if (p) onChange(p.getValue())
        }}
      >
        <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs border-none bg-transparent focus:ring-0 shadow-none px-2">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value="custom" disabled className="text-xs">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center">
          <Input
            type="date"
            className="h-7 w-[110px] text-xs border-none bg-transparent p-0 cursor-pointer focus:ring-0"
            value={value.from ? value.from.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null
              if (date) date.setHours(0, 0, 0, 0)
              onChange({ ...value, from: date })
            }}
          />
        </div>
        <span className="text-xs text-slate-400">to</span>
        <div className="relative flex items-center">
          <Input
            type="date"
            className="h-7 w-[110px] text-xs border-none bg-transparent p-0 cursor-pointer focus:ring-0"
            value={value.to ? value.to.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null
              if (date) date.setHours(23, 59, 59, 999)
              onChange({ ...value, to: date })
            }}
          />
        </div>
      </div>
    </div>
  )
}
