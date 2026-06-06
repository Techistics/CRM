export type HeatLevel = 'hot' | 'warm' | 'cold' | 'dead'

/**
 * Heat is derived from lastContactedAt (or createdAt if never contacted).
 * Updated when WhatsApp is logged, notes/calls are added, reminders fire,
 * or pipeline stage changes (all set lastContactedAt on the lead).
 */
export function getHeatLevel(lastContactedAt: Date | null, createdAt: Date): HeatLevel {
  const reference = lastContactedAt ?? createdAt
  const hours = (Date.now() - reference.getTime()) / (1000 * 60 * 60)
  if (hours < 24) return 'hot'
  if (hours < 72) return 'warm'
  if (hours < 168) return 'cold'
  return 'dead'
}

export const heatConfig = {
  hot: { label: 'Hot', color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500', icon: '🔥' },
  warm: { label: 'Warm', color: 'text-yellow-600', bg: 'bg-yellow-100', dot: 'bg-yellow-500', icon: '☀️' },
  cold: { label: 'Cold', color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500', icon: '🌤️' },
  dead: { label: 'Dead', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500', icon: '❄️' },
}

