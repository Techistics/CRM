export function validateStageTransition(
  currentStageKey: string | null | undefined,
  newStageKey: string,
  orderedStages: { key: string }[],
  deadReason?: string
): { valid: boolean; error?: string } {
  // 1. Enforce reason for terminal stages
  if (['cancelled', 'dead', 'closed'].includes(newStageKey)) {
    if (!deadReason || deadReason.trim() === '') {
      return { valid: false, error: `A reason must be provided when moving to "${newStageKey}".` }
    }
  }

  const currentIdx = currentStageKey ? orderedStages.findIndex((s) => s.key === currentStageKey) : -1
  const newIdx = orderedStages.findIndex((s) => s.key === newStageKey)

  if (newIdx === -1) {
    return { valid: false, error: 'Invalid stage.' }
  }

  // If there's a valid current stage, enforce sequence rules
  if (currentIdx !== -1) {
    if (newIdx <= currentIdx) {
      return { valid: false, error: 'Cannot move backwards in the pipeline.' }
    }
    if (newIdx > currentIdx + 1) {
      return { valid: false, error: 'Cannot skip stages in the pipeline.' }
    }
  }

  return { valid: true }
}
