import type {
  LivenessCheck,
  PanelEconomics,
  RiskAssessment,
  SurveyPanel,
  TargetPlan,
} from './types.ts'

/**
 * The arithmetic that makes this tool worth running.
 *
 * Survey platforms advertise a payout and a survey length, and the ratio of
 * those two is a number you will never actually earn. It ignores the attempts
 * that end in a screen-out five minutes in, which is most of them on an open
 * router. Everything here is built to price that in.
 */

/** Dollars for one completed survey. */
export function usdPerSurvey(panel: SurveyPanel): number {
  if (panel.unitsPerDollar <= 0) return 0
  return panel.typicalUnitsPerSurvey / panel.unitsPerDollar
}

/**
 * Expected minutes spent per *completed* survey, including the time lost to
 * failed screeners along the way.
 *
 * With a screen-out rate p, you expect p/(1-p) failures per success, each
 * costing the screener time. At a 50% screen-out rate that is one wasted
 * screener per completion; at 85% it is nearly six.
 */
export function effectiveMinutesPerSurvey(panel: SurveyPanel): number {
  const rate = clamp01(panel.screenOutRate)
  // A platform that screens out everyone has no finite cost per completion.
  if (rate >= 1) return Number.POSITIVE_INFINITY
  const wastedAttempts = rate / (1 - rate)
  return panel.typicalMinutes + wastedAttempts * panel.screenerMinutes
}

export function computeEconomics(panel: SurveyPanel): PanelEconomics {
  const perSurvey = usdPerSurvey(panel)
  const effectiveMinutes = effectiveMinutesPerSurvey(panel)

  const effectiveHourly =
    Number.isFinite(effectiveMinutes) && effectiveMinutes > 0
      ? perSurvey * (60 / effectiveMinutes)
      : 0
  const nominalHourly = panel.typicalMinutes > 0 ? perSurvey * (60 / panel.typicalMinutes) : 0

  const surveysToMinCashout =
    perSurvey > 0 ? Math.ceil(panel.minCashoutUsd / perSurvey) : Number.POSITIVE_INFINITY
  const hoursToMinCashout =
    Number.isFinite(surveysToMinCashout) && Number.isFinite(effectiveMinutes)
      ? (surveysToMinCashout * effectiveMinutes) / 60
      : Number.POSITIVE_INFINITY

  return {
    usdPerSurvey: round(perSurvey, 2),
    effectiveMinutesPerSurvey: round(effectiveMinutes, 1),
    effectiveHourlyUsd: round(effectiveHourly, 2),
    nominalHourlyUsd: round(nominalHourly, 2),
    surveysToMinCashout,
    hoursToMinCashout: round(hoursToMinCashout, 1),
    realisticWeeklyUsd: round(perSurvey * panel.typicalSurveysPerWeek, 2),
  }
}

/**
 * What it takes to reach a specific gift card value on this panel.
 *
 * A target below the platform's cash-out minimum is reported as unreachable
 * rather than quietly rounded up — being unable to withdraw a balance you have
 * earned is the single most common complaint about these platforms.
 */
export function planForTarget(panel: SurveyPanel, targetUsd: number): TargetPlan {
  const perSurvey = usdPerSurvey(panel)
  const effectiveMinutes = effectiveMinutesPerSurvey(panel)

  if (perSurvey <= 0 || !Number.isFinite(effectiveMinutes)) {
    return {
      targetUsd,
      surveysNeeded: Number.POSITIVE_INFINITY,
      hoursNeeded: Number.POSITIVE_INFINITY,
      weeksNeeded: Number.POSITIVE_INFINITY,
      reachable: false,
      blockedReason: 'This entry is a discovery feed, not a platform you earn on',
    }
  }

  const weeksFor = (surveys: number): number =>
    panel.typicalSurveysPerWeek > 0
      ? round(surveys / panel.typicalSurveysPerWeek, 1)
      : Number.POSITIVE_INFINITY

  if (targetUsd < panel.minCashoutUsd) {
    const surveysNeeded = Math.ceil(panel.minCashoutUsd / perSurvey)
    return {
      targetUsd,
      surveysNeeded,
      hoursNeeded: round((surveysNeeded * effectiveMinutes) / 60, 1),
      weeksNeeded: weeksFor(surveysNeeded),
      reachable: false,
      blockedReason: `Cannot cash out below $${panel.minCashoutUsd}`,
    }
  }

  const surveysNeeded = Math.ceil(targetUsd / perSurvey)
  return {
    targetUsd,
    surveysNeeded,
    hoursNeeded: round((surveysNeeded * effectiveMinutes) / 60, 1),
    weeksNeeded: weeksFor(surveysNeeded),
    reachable: true,
  }
}

/**
 * Ranking score, 0-100.
 *
 * Two things matter and neither is sufficient alone. A good hourly rate on a
 * platform that offers two surveys a week will not get you a gift card this
 * month; high volume at $1/hr is not worth your evening either. The score
 * blends the rate with what the platform can realistically yield in a week, so
 * a panel has to be decent at both to rank well.
 */
export function scorePanel(
  panel: SurveyPanel,
  economics: PanelEconomics,
  liveness: LivenessCheck,
  risk: RiskAssessment,
): number {
  // $15/hr and above saturates; below $1/hr scores near zero.
  const hourlyPoints = 42 * Math.min(1, Math.log10(economics.effectiveHourlyUsd + 1) / Math.log10(16))
  // $40/week and above saturates.
  const volumePoints = 22 * Math.min(1, Math.log10(economics.realisticWeeklyUsd + 1) / Math.log10(41))

  let score = 18 + hourlyPoints + volumePoints

  // Getting paid promptly, and being able to get paid at all, are worth real
  // points — stranded balances are how these platforms keep your money.
  if (panel.minCashoutUsd <= 3) score += 8
  else if (panel.minCashoutUsd >= 15) score -= 8

  if (panel.payoutSpeed === 'instant') score += 5
  else if (panel.payoutSpeed === 'weeks') score -= 5

  if (panel.inviteOnly) score -= 6

  if (risk.level === 'caution') score -= 15
  if (risk.level === 'blocked') score -= 40
  if (!liveness.ok) score -= 4

  return Math.max(0, Math.min(100, Math.round(score)))
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round(value: number, places: number): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}
