'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from 'recharts'
import type { PieSectorDataItem } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChartPalette } from '@/components/consulty-dashboard/lib/chart-palette'

export type PipelineStageBreakdown = { key: string; label: string; count: number }

export type PipelineGroupBreakdown = {
  key: string
  label: string
  count: number
  stages: PipelineStageBreakdown[]
}

function ActiveSector({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: PieSectorDataItem) {
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={4}
      />
    </g>
  )
}

function CustomTooltip({
  active,
  payload,
  donutTotal,
  groups,
}: {
  active?: boolean
  payload?: Array<{ name?: string | number; value?: number }>
  donutTotal: number
  groups: PipelineGroupBreakdown[]
}) {
  if (!active || !payload?.length) return null
  const name = String(payload[0].name ?? '')
  const val = Number(payload[0].value ?? 0)
  const pct = donutTotal > 0 ? Math.round((val / donutTotal) * 100) : 0
  const stages: PipelineStageBreakdown[] =
    groups.find((group) => group.label === name)?.stages ?? []

  return (
    <div className="min-w-36 rounded-consulty-md border border-consulty-border bg-consulty-surface-raised px-3 py-2.5 text-crm-xs shadow-consulty-md dark:border-consulty-border dark:bg-consulty-surface-raised">
      <p className="font-semibold text-consulty-text-primary">
        {name}: {val} ({pct}%)
      </p>
      {stages.length > 0 && (
        <div className="mt-1.5 space-y-1 border-t border-consulty-border-subtle pt-1.5 dark:border-consulty-border">
          {stages.map((stage) => (
            <div key={stage.key} className="flex justify-between gap-4 text-consulty-text-secondary">
              <span className="truncate">{stage.label}</span>
              <span className="font-medium text-consulty-text-primary">{stage.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PipelineDistributionDonut({
  groups,
  centerValue,
  legendTitle = 'Pipeline Breakdown',
  compact = false,
}: {
  groups: PipelineGroupBreakdown[]
  centerValue?: string
  legendTitle?: string
  compact?: boolean
}) {
  const { series: colors } = useChartPalette()
  const donutTotal = groups.reduce((sum, group) => sum + group.count, 0)
  const chartData = groups.map((group) => ({ name: group.label, value: group.count }))

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  return (
    <div className={cn(
      "flex flex-1 items-center justify-center gap-6",
      compact ? "flex-col" : "flex-col sm:flex-row lg:gap-8"
    )}>
      <div className={cn(
        "relative flex-shrink-0",
        compact ? "h-40 w-40" : "h-52 w-52 sm:h-56 sm:w-56"
      )}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={3}
              cornerRadius={4}
              stroke="none"
              isAnimationActive
              animationDuration={500}
              // @ts-expect-error - Recharts types are incomplete for activeIndex
              activeIndex={activeIndex ?? undefined}
              activeShape={ActiveSector}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={colors[(index + 1) % colors.length] ?? colors[0]}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <CustomTooltip
                  donutTotal={donutTotal}
                  groups={groups}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-150',
            activeIndex !== null ? 'opacity-0' : 'opacity-100',
          )}
        >
          <span className="text-crm-2xl font-bold tabular-nums text-consulty-text-primary">
            {centerValue ?? donutTotal.toLocaleString()}
          </span>
          <span className="mt-1 text-crm-xs font-semibold uppercase tracking-wider text-consulty-text-muted">
            Total Leads
          </span>
        </div>
      </div>

      <div className={cn("w-full max-w-md flex-1 space-y-2", compact ? "sm:w-full" : "sm:w-auto")}>
        <p className={cn(
          "mb-2 text-crm-xs font-semibold uppercase tracking-wider text-consulty-text-muted",
          compact ? "text-left" : "text-center sm:text-left"
        )}>
          {legendTitle}
        </p>
        {groups.map((group, i) => {
          const pct = donutTotal > 0 ? Math.round((group.count / donutTotal) * 100) : 0
          const isExpanded = expandedGroup === group.label
          const fillColor = colors[(i + 1) % colors.length] ?? colors[0]

          return (
            <div
              key={group.key}
              className="flex flex-col overflow-hidden rounded-consulty-md border border-consulty-border-subtle bg-consulty-surface transition-all dark:border-consulty-border dark:bg-consulty-surface"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div
                className={cn(
                  'flex w-full items-center justify-between p-2.5 text-left transition-colors sm:p-3',
                  'hover:bg-consulty-surface-subtle dark:hover:bg-consulty-surface-raised/50',
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full border border-consulty-border-subtle dark:border-consulty-border"
                    style={{ backgroundColor: fillColor }}
                  />
                  <span className="truncate text-crm-xs font-semibold text-consulty-text-secondary">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                  <span className="text-crm-xs font-bold tabular-nums text-consulty-text-primary">
                    {group.count}
                  </span>
                  <span className="w-10 rounded-consulty-sm bg-consulty-surface-subtle py-0.5 text-center text-crm-xs font-semibold tabular-nums text-consulty-text-muted dark:bg-consulty-surface-subtle/50">
                    {pct}%
                  </span>
                  {group.stages.length > 0 ? (
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse stages' : 'Expand stages'}
                      onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                      className="cursor-pointer p-0.5"
                    >
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-consulty-text-muted transition-transform duration-200',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </button>
                  ) : (
                    <div className="w-3.5" />
                  )}
                </div>
              </div>

              {isExpanded && group.stages.length > 0 && (
                <div className="border-t border-consulty-border-subtle bg-consulty-surface-subtle px-3 py-2.5 dark:border-consulty-border dark:bg-consulty-surface-subtle/40">
                  <div className="space-y-2">
                    {group.stages.map((stage) => {
                      const stagePct = group.count > 0 ? Math.round((stage.count / group.count) * 100) : 0
                      return (
                        <div key={stage.key} className="flex items-center gap-2">
                          <span className="w-24 truncate text-left text-crm-xs text-consulty-text-secondary">
                            {stage.label}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-consulty-border-subtle dark:bg-consulty-border">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${stagePct}%`, backgroundColor: fillColor }}
                            />
                          </div>
                          <span className="w-6 text-right text-crm-xs font-medium tabular-nums text-consulty-text-primary">
                            {stage.count}
                          </span>
                          <span className="w-8 text-right text-crm-xs tabular-nums text-consulty-text-muted">
                            {stagePct}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
