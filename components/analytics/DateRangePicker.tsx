'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

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
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is sunday
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

  const isActive = (label: string): boolean => {
    let range: DateRange
    switch (label) {
      case 'This Week':
        range = thisWeek()
        break
      case 'This Month':
        range = thisMonth()
        break
      case 'This Year':
        range = thisYear()
        break
      case 'All Time':
        range = { from: null, to: null }
        break
      default:
        return false
    }

    const valueFromStr = value.from ? value.from.toISOString().split('T')[0] : null
    const valueToStr = value.to ? value.to.toISOString().split('T')[0] : null
    const rangeFromStr = range.from ? range.from.toISOString().split('T')[0] : null
    const rangeToStr = range.to ? range.to.toISOString().split('T')[0] : null

    return valueFromStr === rangeFromStr && valueToStr === rangeToStr
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[
        { label: 'This Week', getValue: thisWeek },
        { label: 'This Month', getValue: thisMonth },
        { label: 'This Year', getValue: thisYear },
        { label: 'All Time', getValue: () => ({ from: null, to: null }) },
      ].map(({ label, getValue }) => (
        <Button
          key={label}
          variant={isActive(label) ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange(getValue())}
        >
          {label}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="h-8 w-36 text-xs"
          value={value.from ? value.from.toISOString().split('T')[0] : ''}
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null
            if (date) date.setHours(0, 0, 0, 0)
            onChange({ ...value, from: date })
          }}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          className="h-8 w-36 text-xs"
          value={value.to ? value.to.toISOString().split('T')[0] : ''}
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null
            if (date) date.setHours(23, 59, 59, 999)
            onChange({ ...value, to: date })
          }}
        />
      </div>
    </div>
  )
}
