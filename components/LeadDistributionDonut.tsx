'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DONUT_COLORS = [
  '#94a3b8',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#14b8a6',
  '#6366f1',
]

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
      {/* slightly larger + a subtle ring so the active slice reads as "lifted" */}
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
    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg px-3 py-2.5 shadow-xl text-xs min-w-[150px] border border-white/5">
      <p className="font-semibold text-slate-100">
        {name}: {val} ({pct}%)
      </p>
      {stages.length > 0 && (
        <div className="pt-1.5 mt-1.5 border-t border-white/10 space-y-1">
          {stages.map((s) => (
            <div key={s.key} className="flex justify-between gap-4 text-slate-300">
              <span className="truncate">{s.label}</span>
              <span className="font-medium text-slate-100">{s.count}</span>
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
}: {
  unassignedCount: number
  breakdown: AgentBreakdown[]
  unassignedBreakdown: StageBreakdown[]
  onUnassignedClick: () => void
}) {
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
    <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 lg:gap-12">
      {/* ── Chart ── */}
      <div className="relative h-[240px] w-[240px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={100}
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
                <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
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

        {/* center label — hidden while the tooltip is showing so the two overlays never print on top of each other */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-150',
            activeIndex !== null ? 'opacity-0' : 'opacity-100',
          )}
        >
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{donutTotal}</span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-1">
            Total Leads
          </span>
        </div>
      </div>

      {/* ── Legend / Breakdown list ── */}
      <div className="w-full sm:w-auto flex-1 max-w-md space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">
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

          return (
            <div
              key={label}
              className="flex flex-col border border-slate-100 dark:border-slate-800/60 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <button
                onClick={() => {
                  if (isUnassigned) {
                    onUnassignedClick()
                  } else if (agent?.stages.length) {
                    setExpandedCounselor(isExpanded ? null : label)
                  }
                }}
                className={cn(
                  'flex items-center justify-between w-full p-3.5 text-left transition-colors',
                  isUnassigned || agent?.stages.length
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                    : 'cursor-default',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{val}</span>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-1 px-2 rounded-md w-12 text-center">
                    {pct}%
                  </span>
                  {!isUnassigned && agent?.stages?.length ? (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-slate-400 transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  ) : (
                    <div className="w-4" />
                  )}
                </div>
              </button>

              {isExpanded && stages.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/20 px-4 py-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-2.5">
                    {stages.map((stage) => {
                      const stagePct = stageBase > 0 ? Math.round((stage.count / stageBase) * 100) : 0
                      return (
                        <div key={stage.key} className="flex items-center gap-3">
                          <span className="text-[13px] text-slate-600 dark:text-slate-400 w-32 truncate">
                            {stage.label}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${stagePct}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                            />
                          </div>
                          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 w-8 text-right">
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