'use client'

import { useState } from 'react'

export interface DonutSegment {
  label: string
  count: number
  pct: number
  /** Hex or named CSS color for this segment */
  color: string
  /** Optional key identifier */
  key?: string
}

interface Props {
  segments: DonutSegment[]
  total: number
  /** Outer diameter in px (default 160) */
  size?: number
  /** Stroke width of the donut ring (default 26) */
  thickness?: number
}

/**
 * Pure-SVG segmented donut chart with Admin-style card legend.
 */
export function ProPipelineDonut({
  segments,
  total,
  size = 160,
  thickness = 26,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2

  // Gap between segments in degrees
  const GAP_DEG = 3
  const gapFraction = GAP_DEG / 360

  // Build arc paths
  type Arc = { d: string; color: string; index: number }
  const arcs: Arc[] = []

  let cumulative = 0
  segments.forEach((seg, i) => {
    const fraction = total > 0 ? seg.count / total : 0
    const effectiveFraction = Math.max(0, fraction - gapFraction)

    if (effectiveFraction > 0) {
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
      const endAngle = (cumulative + effectiveFraction) * 2 * Math.PI - Math.PI / 2

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)

      const largeArc = effectiveFraction > 0.5 ? 1 : 0

      arcs.push({
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        color: seg.color,
        index: i,
      })
    }

    cumulative += fraction
  })

  const isHovered = hovered !== null
  const hoveredSeg = hovered !== null ? segments[hovered] : null

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 w-full">
      {/* ── Donut SVG ── */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Track ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth={thickness}
            className="stroke-slate-100 dark:stroke-slate-800"
          />

          {/* Segments */}
          {arcs.map((arc) => {
            const active = hovered === arc.index
            return (
              <path
                key={arc.index}
                d={arc.d}
                fill="none"
                strokeWidth={active ? thickness + 4 : thickness}
                strokeLinecap="butt"
                stroke={arc.color}
                className="transition-all duration-150 cursor-pointer"
                style={
                  active
                    ? { filter: `drop-shadow(0 0 8px ${arc.color}aa)` }
                    : undefined
                }
                onMouseEnter={() => setHovered(arc.index)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </svg>

        {/* Center metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {isHovered && hoveredSeg ? (
            <>
              <span
                className="text-xl font-bold leading-none tabular-nums"
                style={{ color: hoveredSeg.color }}
              >
                {hoveredSeg.count.toLocaleString()}
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center leading-tight max-w-[80px] truncate">
                {hoveredSeg.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-100">
                {total.toLocaleString()}
              </span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                TOTAL LEADS
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Legend (Admin Page Card Style) ── */}
      <div className="flex-1 min-w-0 w-full space-y-2">
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
              hovered === i
                ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500/40'
                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-transform duration-150"
                style={{ background: seg.color }}
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {seg.label}
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {seg.count.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800">
                {seg.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
