'use client'

import { Download, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DateRangePicker } from '@/components/analytics/DateRangePicker'

type OverviewHeaderProps = {
  dateRange: { from: Date | null; to: Date | null }
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void
  onExport: (type: 'pipeline' | 'agent') => void
  exportingPipeline: boolean
  exportingAgent: boolean
  isLoading?: boolean
}

export function OverviewHeader({
  dateRange,
  onDateRangeChange,
  onExport,
  exportingPipeline,
  exportingAgent,
  isLoading,
}: OverviewHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-crm-lg font-bold text-consulty-text-primary">Overview</h1>
        <p className="mt-0.5 text-crm-xs text-consulty-text-secondary">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-consulty-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-consulty-primary" />
              </span>
              Calculating live metrics…
            </span>
          ) : (
            'Track your pipeline and team performance in real-time'
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-consulty-sm border-consulty-border-subtle bg-consulty-surface px-3 text-crm-xs font-medium text-consulty-text-secondary hover:bg-consulty-surface-subtle dark:border-consulty-border dark:bg-consulty-surface dark:hover:bg-consulty-surface-raised"
            >
              <Download className="h-3.5 w-3.5 text-consulty-primary" />
              Export Reports
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-crm-xs">Export Reports</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onExport('pipeline')}
              disabled={exportingPipeline}
              className="cursor-pointer gap-2 text-crm-xs"
            >
              {exportingPipeline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Pipeline Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport('agent')}
              disabled={exportingAgent}
              className="cursor-pointer gap-2 text-crm-xs"
            >
              {exportingAgent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Counselor Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>
    </div>
  )
}
