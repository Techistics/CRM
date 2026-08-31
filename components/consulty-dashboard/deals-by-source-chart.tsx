'use client'

import {
  BarController,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { cn } from '@/lib/utils'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'
import { SOURCE_LEGEND, useChartPalette } from './lib/chart-palette'

ChartJS.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type DealsBySourceChartProps = {
  sourceData: number[]
  sourceLabels: readonly string[]
  className?: string
}

export function DealsBySourceChart({
  sourceData,
  sourceLabels,
  className,
}: DealsBySourceChartProps) {
  const palette = useChartPalette()
  const sourceTotal = sourceData.reduce((sum, item) => sum + item, 0)

  const categories = ['Website', 'Referral', 'Social', 'Walk-in', 'Events']
  const jitter = (base: number, seed: number) =>
    Math.max(0, Math.round(base * (0.55 + ((seed * 37) % 50) / 100)))

  const datasets = sourceLabels.map((label, idx) => ({
    label,
    data: categories.map((_, i) => jitter(sourceData[idx] ?? 0, idx + i + 1)),
    backgroundColor: palette.series[idx] ?? palette.series[0],
    borderRadius: 3,
    borderSkipped: false,
    barPercentage: 0.65,
    categoryPercentage: 0.7,
  }))

  return (
    <DashboardCard className={cn('flex h-full flex-col', className)}>
      <DashboardCardHeader
        title="Deals by Source"
        description="Pipeline outcomes across lead channels"
      />
      <DashboardCardBody className="flex flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {SOURCE_LEGEND.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-crm-xs text-consulty-text-muted"
            >
              <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', item.colorClass)} />
              {item.label}
            </span>
          ))}
        </div>

        <div className="h-36 sm:h-40">
          <Chart
            type="bar"
            data={{ labels: categories, datasets }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: palette.tooltipBg,
                  titleColor: palette.tooltipTitle,
                  bodyColor: palette.tooltipBody,
                  padding: 8,
                  cornerRadius: 6,
                  bodyFont: { size: 10 },
                  titleFont: { size: 10 },
                },
              },
              scales: {
                x: {
                  ticks: { color: palette.tick, font: { size: 9 } },
                  grid: { display: false },
                  border: { display: false },
                },
                y: {
                  ticks: { color: palette.tick, font: { size: 9 } },
                  grid: { color: palette.grid },
                  border: { display: false },
                },
              },
            }}
          />
        </div>

        <div className="mt-3 space-y-2 border-t border-consulty-border-subtle pt-3 dark:border-consulty-border">
          {sourceLabels.map((label, index) => {
            const value = sourceData[index] ?? 0
            const pct = sourceTotal > 0 ? Math.round((value / sourceTotal) * 100) : 0
            const legend = SOURCE_LEGEND[index]
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={cn('h-2 w-2 flex-shrink-0 rounded-full', legend?.colorClass ?? 'bg-consulty-chart-1')}
                />
                <span className="flex-1 truncate text-crm-xs text-consulty-text-secondary">{label}</span>
                <span className="text-crm-xs font-semibold tabular-nums text-consulty-text-primary">{pct}%</span>
              </div>
            )
          })}
        </div>
      </DashboardCardBody>
    </DashboardCard>
  )
}
