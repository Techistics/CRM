'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChartPalette } from '@/components/consulty-dashboard/lib/chart-palette'

const DONUT_COLOR_CLASSES = [
  'bg-consulty-text-muted',
  'bg-consulty-chart-1',
  'bg-consulty-chart-2',
  'bg-consulty-chart-3',
  'bg-consulty-chart-4',
  'bg-consulty-chart-5',
  'bg-consulty-chart-6',
] as const

export type StageBreakdown = { key: string; label: string; count: number }

export type AgentBreakdown = {
  agentId: string | null
  agentName: string
  totalLeads: number
  stages: StageBreakdown[]
}

function ActiveSector(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
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
  donutLabels,
  breakdown,
  unassignedBreakdown,
}: any) {
  if (!active || !payload?.length) return null
  const name = payload[0].name as string
  const val = payload[0].value as number
  const index = donutLabels.indexOf(name)
  const pct = donutTotal > 0 ? Math.round((val / donutTotal) * 100) : 0
  const isUnassigned = index === 0
  const stages: StageBreakdown[] = isUnassigned
    ? unassignedBreakdown
    : breakdown[index - 1]?.stages ?? []

  return (
    <div className="min-w-36 rounded-consulty-md border border-consulty-border bg-consulty-surface-raised px-3 py-2.5 text-crm-xs shadow-consulty-md dark:border-consulty-border dark:bg-consulty-surface-raised">
      <p className="font-semibold text-consulty-text-primary">
        {name}: {val} ({pct}%)
      </p>
      {stages.length > 0 && (
        <div className="mt-1.5 space-y-1 border-t border-consulty-border-subtle pt-1.5 dark:border-consulty-border">
          {stages.map((s) => (
            <div key={s.key} className="flex justify-between gap-4 text-consulty-text-secondary">
              <span className="truncate">{s.label}</span>
              <span className="font-medium text-consulty-text-primary">{s.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeadDistributionDonut({
  unassignedCount,
  breakdown,
  unassignedBreakdown,
  onUnassignedClick,
  centerValue,
}: {
  unassignedCount: number
  breakdown: AgentBreakdown[]
  unassignedBreakdown: StageBreakdown[]
  onUnassignedClick: () => void
  centerValue?: string
}) {
  const { series: colors } = useChartPalette()
  const donutLabels = ['Unassigned', ...breakdown.map((a) => a.agentName)]
  const donutData = [unassignedCount, ...breakdown.map((a) => a.totalLeads)]
  const donutTotal = donutData.reduce((a, b) => a + b, 0)

  const chartData = donutLabels.map((label, i) => ({
    name: label,
    value: donutData[i],
  }))

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [expandedCounselor, setExpandedCounselor] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row lg:gap-8">
      <div className="relative h-52 w-52 flex-shrink-0 sm:h-56 sm:w-56">
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
              // @ts-ignore - Recharts types are incomplete for activeIndex
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
                  donutLabels={donutLabels}
                  breakdown={breakdown}
                  unassignedBreakdown={unassignedBreakdown}
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

      <div className="w-full max-w-md flex-1 space-y-2 sm:w-auto">
        <p className="mb-2 text-center text-crm-xs font-semibold uppercase tracking-wider text-consulty-text-muted sm:text-left">
          Counselor Breakdown
        </p>
        {donutLabels.map((label, i) => {
          const val = donutData[i]
          const pct = donutTotal > 0 ? Math.round((val / donutTotal) * 100) : 0
          const isUnassigned = i === 0
          const agent = isUnassigned ? null : breakdown[i - 1]
          const isExpanded = expandedCounselor === label
          const stages = isUnassigned ? unassignedBreakdown : agent?.stages ?? []
          const stageBase = isUnassigned ? unassignedCount : agent?.totalLeads ?? 0
          const colorClass = DONUT_COLOR_CLASSES[i % DONUT_COLOR_CLASSES.length]
          const fillColor = colors[(i + 1) % colors.length] ?? colors[0]

          return (
            <div
              key={label}
              className="flex flex-col overflow-hidden rounded-consulty-md border border-consulty-border-subtle bg-consulty-surface transition-all dark:border-consulty-border dark:bg-consulty-surface"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <button
                type="button"
                onClick={() => {
                  if (isUnassigned) {
                    onUnassignedClick()
                  } else if (agent?.stages.length) {
                    setExpandedCounselor(isExpanded ? null : label)
                  }
                }}
                className={cn(
                  'flex w-full items-center justify-between p-2.5 text-left transition-colors sm:p-3',
                  isUnassigned || agent?.stages.length
                    ? 'cursor-pointer hover:bg-consulty-surface-subtle dark:hover:bg-consulty-surface-raised/50'
                    : 'cursor-default',
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'h-3 w-3 flex-shrink-0 rounded-full border border-consulty-border-subtle dark:border-consulty-border',
                      colorClass,
                    )}
                  />
                  <span className="truncate text-crm-xs font-semibold text-consulty-text-secondary">
                    {label}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                  <span className="text-crm-xs font-bold tabular-nums text-consulty-text-primary">
                    {val}
                  </span>
                  <span className="w-10 rounded-consulty-sm bg-consulty-surface-subtle py-0.5 text-center text-crm-xs font-semibold tabular-nums text-consulty-text-muted dark:bg-consulty-surface-subtle/50">
                    {pct}%
                  </span>
                  {!isUnassigned && agent?.stages?.length ? (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 text-consulty-text-muted transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  ) : (
                    <div className="w-3.5" />
                  )}
                </div>
              </button>

              {isExpanded && stages.length > 0 && (
                <div className="border-t border-consulty-border-subtle bg-consulty-surface-subtle px-3 py-2.5 dark:border-consulty-border dark:bg-consulty-surface-subtle/40">
                  <div className="space-y-2">
                    {stages.map((stage) => {
                      const stagePct = stageBase > 0 ? Math.round((stage.count / stageBase) * 100) : 0
                      return (
                        <div key={stage.key} className="flex items-center gap-2">
                          <span className="w-24 truncate text-crm-xs text-consulty-text-secondary">
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
