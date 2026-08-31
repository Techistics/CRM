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
    { label: 'Last 30 Days', value: 'month', getValue: thisMonth },
    { label: 'This Week', value: 'week', getValue: thisWeek },
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

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '—'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 items-center gap-1.5 rounded-consulty-sm border border-consulty-border-subtle bg-consulty-surface px-2.5 dark:border-consulty-border dark:bg-consulty-surface">
        <Select
          value={getCurrentPreset()}
          onValueChange={(val) => {
            const p = presets.find((x) => x.value === val)
            if (p) onChange(p.getValue())
          }}
        >
          <SelectTrigger className="h-7 w-auto min-w-24 border-none bg-transparent px-1 text-crm-xs shadow-none focus:ring-0">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-crm-xs">
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled className="text-crm-xs">
              Custom Range
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-8 items-center gap-1.5 rounded-consulty-sm border border-consulty-border-subtle bg-consulty-surface px-2.5 dark:border-consulty-border dark:bg-consulty-surface">
        <CalendarIcon className="h-3.5 w-3.5 text-consulty-text-muted" />
        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="h-7 w-28 border-none bg-transparent p-0 text-crm-xs focus-visible:ring-0"
            value={value.from ? value.from.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null
              if (date) date.setHours(0, 0, 0, 0)
              onChange({ ...value, from: date })
            }}
          />
          <span className="text-crm-xs text-consulty-text-muted">–</span>
          <Input
            type="date"
            className="h-7 w-28 border-none bg-transparent p-0 text-crm-xs focus-visible:ring-0"
            value={value.to ? value.to.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : null
              if (date) date.setHours(23, 59, 59, 999)
              onChange({ ...value, to: date })
            }}
          />
        </div>
        <span className="hidden text-crm-xs text-consulty-text-muted lg:inline">
          {formatDisplayDate(value.from)} – {formatDisplayDate(value.to)}
        </span>
      </div>
    </div>
  )
}
