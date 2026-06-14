export type HeatLevel = 'hot' | 'warm' | 'cold' | 'dead'

export function getHeatLevel(lastContactedAt: Date | null, createdAt: Date): HeatLevel {
  const reference = lastContactedAt ?? createdAt
  const hours = (Date.now() - reference.getTime()) / (1000 * 60 * 60)
  if (hours < 72) return 'hot'    // ≤3 days
  if (hours < 168) return 'warm'  // 3-7 days
  if (hours < 336) return 'cold'  // 7-14 days
  return 'dead'
}

export const heatConfig = {
  hot:  { label: 'Fresh',   color: 'text-green-600',  bg: 'bg-green-100',  dot: 'bg-green-500' },
warm: { label: 'Fading',  color: 'text-yellow-600', bg: 'bg-yellow-100', dot: 'bg-yellow-500',},
cold: { label: 'Stale',   color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500',},
dead: { label: 'Dormant', color: 'text-red-600',    bg: 'bg-red-100',    dot: 'bg-red-500',},
}

