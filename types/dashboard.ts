import type { LucideIcon } from 'lucide-react'
import type { AgentBreakdown, StageBreakdown } from '@/components/LeadDistributionDonut'

export type MetricCardData = {
  label: string
  value: string
  trend: string
  positive: boolean
  comparison: string
  icon: LucideIcon
  accent: 'primary' | 'success' | 'secondary' | 'danger'
  sparkData: number[]
  colorIndex: number
}

export type TeamPerformanceRow = {
  id: string
  name: string
  email: string
  total_leads: number
  won: number
  cold_leads: number
  dead_leads: number
  conversion_rate: number | null
  last_activity: string | null
}

export type SnapshotItem = {
  label: string
  value: string
  description: string
  icon: LucideIcon
  accent: 'primary' | 'secondary' | 'success'
}

export type LeadDistributionCardProps = {
  unassignedCount: number
  breakdown: AgentBreakdown[]
  unassignedBreakdown: StageBreakdown[]
  totalLeads: number
  tenantSlug: string
  className?: string
}
