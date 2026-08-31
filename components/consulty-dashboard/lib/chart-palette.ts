'use client'

import { useMemo } from 'react'
import { useIsDark } from '../hooks/use-is-dark'

import { CHART_VAR_KEYS, SOURCE_LEGEND } from '@/constants/dashboard'

export { CHART_VAR_KEYS, SOURCE_LEGEND }

function readRgbVar(name: string): string {
  if (typeof window === 'undefined') return 'rgb(59 130 246)'
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value ? `rgb(${value.replace(/ /g, ', ')})` : 'rgb(59 130 246)'
}

export function getChartSeriesColors(): string[] {
  return CHART_VAR_KEYS.map((key) => readRgbVar(key))
}

export function useChartPalette() {
  const isDark = useIsDark()

  return useMemo(
    () => ({
      series: getChartSeriesColors(),
      tick: readRgbVar('--consulty-text-muted'),
      grid: isDark ? 'rgba(255,255,255,0.06)' : readRgbVar('--consulty-border-subtle'),
      tooltipBg: readRgbVar('--consulty-surface-raised'),
      tooltipTitle: readRgbVar('--consulty-text-muted'),
      tooltipBody: readRgbVar('--consulty-text-primary'),
      pointBorder: readRgbVar('--consulty-surface'),
    }),
    [isDark],
  )
}

export const METRIC_ACCENT = {
  primary: {
    iconBg: 'bg-consulty-primary-soft dark:bg-consulty-primary-soft/40',
    iconColor: 'text-consulty-primary',
    sparkClass: 'text-consulty-primary',
  },
  success: {
    iconBg: 'bg-consulty-success-soft dark:bg-consulty-success-soft/40',
    iconColor: 'text-consulty-success',
    sparkClass: 'text-consulty-success',
  },
  secondary: {
    iconBg: 'bg-consulty-secondary-soft dark:bg-consulty-secondary-soft/40',
    iconColor: 'text-consulty-secondary',
    sparkClass: 'text-consulty-secondary',
  },
  danger: {
    iconBg: 'bg-consulty-danger-soft dark:bg-consulty-danger-soft/40',
    iconColor: 'text-consulty-danger',
    sparkClass: 'text-consulty-danger',
  },
} as const

