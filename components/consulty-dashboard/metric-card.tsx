'use client'

import {
  BarController,
  LineController,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  BarElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricCardData } from '@/types/dashboard'
import { METRIC_ACCENT_STYLES as ACCENT_STYLES } from '@/constants/dashboard'
import { useChartPalette } from './lib/chart-palette'

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

type MetricSparklineProps = {
  data: number[]
  colorIndex?: number
  className?: string
}

export function MetricSparkline({ data, colorIndex = 0, className }: MetricSparklineProps) {
  const palette = useChartPalette()
  const stroke = palette.series[colorIndex] ?? palette.series[0]

  return (
    <div className={cn('h-6 w-full', className)}>
      <Line
        data={{
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: stroke,
              backgroundColor: `${stroke}33`,
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              fill: true,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { line: { borderCapStyle: 'round' } },
        }}
      />
    </div>
  )
}

export type { MetricCardData }

type MetricCardProps = {
  metric: MetricCardData
}

export function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon
  const accent = ACCENT_STYLES[metric.accent]

  return (
    <div className="rounded-consulty-lg border border-consulty-border-subtle bg-consulty-surface p-3 shadow-consulty-sm dark:border-consulty-border dark:bg-consulty-surface sm:p-3.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-crm-xs font-medium text-consulty-text-muted">{metric.label}</p>
          <p className="mt-0.5 text-crm-xl font-bold tabular-nums tracking-tight text-consulty-text-primary">
            {metric.value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-consulty-md',
            accent.iconBg,
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', accent.iconColor)} />
        </div>
      </div>

      <MetricSparkline data={metric.sparkData} colorIndex={metric.colorIndex} className="mb-2" />

      <div
        className={cn(
          'flex items-center gap-1 text-crm-xs font-medium',
          metric.positive ? 'text-consulty-success' : 'text-consulty-danger',
        )}
      >
        {metric.positive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{metric.trend}</span>
        <span className="font-normal text-consulty-text-muted">{metric.comparison}</span>
      </div>
    </div>
  )
}

export function MetricCardsGrid({ metrics }: { metrics: MetricCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </div>
  )
}
