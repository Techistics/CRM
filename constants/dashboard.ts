export const METRIC_ACCENT_STYLES = {
  primary: {
    iconBg: 'bg-consulty-primary-soft dark:bg-consulty-primary-soft/30',
    iconColor: 'text-consulty-primary',
  },
  success: {
    iconBg: 'bg-consulty-success-soft dark:bg-consulty-success-soft/30',
    iconColor: 'text-consulty-success',
  },
  secondary: {
    iconBg: 'bg-consulty-secondary-soft dark:bg-consulty-secondary-soft/30',
    iconColor: 'text-consulty-secondary',
  },
  danger: {
    iconBg: 'bg-consulty-danger-soft dark:bg-consulty-danger-soft/30',
    iconColor: 'text-consulty-danger',
  },
} as const

export const SNAPSHOT_ACCENT_STYLES = {
  primary: {
    iconBg: 'bg-consulty-primary-soft dark:bg-consulty-primary-soft/30',
    iconColor: 'text-consulty-primary',
  },
  secondary: {
    iconBg: 'bg-consulty-secondary-soft dark:bg-consulty-secondary-soft/30',
    iconColor: 'text-consulty-secondary',
  },
  success: {
    iconBg: 'bg-consulty-success-soft dark:bg-consulty-success-soft/30',
    iconColor: 'text-consulty-success',
  },
} as const

export const CHART_VAR_KEYS = [
  '--consulty-chart-1',
  '--consulty-chart-2',
  '--consulty-chart-3',
  '--consulty-chart-4',
  '--consulty-chart-5',
  '--consulty-chart-6',
] as const

export const SOURCE_LEGEND = [
  { label: 'Pipeline', colorClass: 'bg-consulty-chart-1' },
  { label: 'Won', colorClass: 'bg-consulty-chart-2' },
  { label: 'Lost', colorClass: 'bg-consulty-chart-4' },
  { label: 'Unassigned', colorClass: 'bg-consulty-chart-3' },
] as const
