export type StageDatum = {
  value: string
  label: string
  count: number
  color: string
}

export type AgentStat = {
  id: string
  name: string
  email: string | null
  total: number
  active: number
  paid: number
  cancelled: number
}

export type FunnelStep = {
  label: string
  count: number
  pct: number
  colorClass: string
}

export type ChartWindow = 'week' | 'month' | 'year'
