export type HeatLevel = 'active' | 'cold' | 'dead'

export function getHeatLevel(lastContactedAt: Date | null, createdAt: Date, isDeadManual: boolean): HeatLevel {
  if (isDeadManual) return 'dead'
  const reference = lastContactedAt ?? createdAt
  const hours = (Date.now() - reference.getTime()) / (1000 * 60 * 60)
  if (hours < 96) return 'active' // < 4 days
  return 'cold' // >= 4 days
}

export const heatConfig = {
  active: { label: 'Active', color: 'text-green-600',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  cold:   { label: 'Cold',   color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  dead:   { label: 'Dead',   color: 'text-red-600',    bg: 'bg-red-100',    dot: 'bg-red-500' },
}

