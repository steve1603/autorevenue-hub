import type { EffortLevel, GiftCardSource, LivenessCheck, RiskAssessment } from './types.ts'

/**
 * Ranking. The goal is to push genuinely worthwhile methods up and grind-heavy
 * or conditional ones down, so the list is not just sorted by the biggest
 * number anyone claims.
 */

const EFFORT_BONUS: Record<EffortLevel, number> = {
  passive: 25,
  low: 18,
  medium: 8,
  high: 0,
}

export const EFFORT_ORDER: Record<EffortLevel, number> = {
  passive: 0,
  low: 1,
  medium: 2,
  high: 3,
}

/** Diminishing returns on headline value, so a big claim cannot dominate. */
function valuePoints(monthlyUsd: number): number {
  return Math.min(45, 22 * Math.log10(monthlyUsd + 1))
}

export function scoreProgram(
  source: GiftCardSource,
  liveness: LivenessCheck,
  risk: RiskAssessment,
): number {
  const [low, high] = source.monthlyValueUsd
  const amortisedOneOff = (source.oneTimeUpsideUsd ?? 0) / 12
  const midpoint = (low + high) / 2 + amortisedOneOff

  let score = 30 + valuePoints(midpoint) + EFFORT_BONUS[source.effort]

  if (source.requiresPurchase) score -= 12
  if (source.payoutThresholdUsd !== undefined) {
    if (source.payoutThresholdUsd > 15) score -= 6
    else if (source.payoutThresholdUsd <= 5) score += 4
  }

  if (risk.level === 'caution') score -= 15
  if (risk.level === 'blocked') score -= 40

  // An unverified entry is still worth showing, but should not outrank one we
  // just confirmed is up.
  if (!liveness.ok) score -= 10

  return clamp(score)
}

export function scoreOffer(input: {
  valueUsd?: number
  brands: string[]
  risk: RiskAssessment
  sourceEffort: EffortLevel
}): number {
  let score = 40

  if (input.valueUsd !== undefined) score += Math.min(25, input.valueUsd / 2)
  if (input.brands.length > 0) score += 6
  score += EFFORT_BONUS[input.sourceEffort] / 2
  score -= input.risk.score * 0.45

  return clamp(score)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
