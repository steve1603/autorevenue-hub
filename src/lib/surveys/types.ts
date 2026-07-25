// Shared types for the survey finder.

/** What kind of work the platform actually asks of you. */
export type PanelKind =
  /** Classic market-research surveys, usually with screener questions. */
  | 'survey-panel'
  /** Routers that resell surveys from many panels, plus offer walls. */
  | 'gpt-router'
  /** Paid research studies: interviews, usability tests, diary studies. */
  | 'research-study'
  /** Piecework: transcription, data labelling, search evaluation. */
  | 'microtask'

/** How the platform denominates what you earn. */
export type PayoutUnit = 'points' | 'usd'

export type PayoutSpeed = 'instant' | 'same-day' | 'days' | 'weeks'

export interface SurveyPanel {
  id: string
  name: string
  kind: PanelKind
  url: string
  /** Pages crawled for currently-open studies, where listed publicly. */
  discoveryUrls?: string[]
  parser?: 'html' | 'reddit-json'

  // --- what you earn -------------------------------------------------------
  payoutUnit: PayoutUnit
  /**
   * Platform units per US dollar. 100 means "100 points = $1".
   * Always 1 for platforms that pay cash directly.
   */
  unitsPerDollar: number
  /** Typical award for one completed survey, in the platform's own units. */
  typicalUnitsPerSurvey: number

  // --- what it costs you ---------------------------------------------------
  /** Minutes for a survey you actually qualify for and finish. */
  typicalMinutes: number
  /**
   * Share of attempts ending in a screen-out, 0-1. This is the number that
   * decides whether a panel is worth opening, and the one panels never publish.
   */
  screenOutRate: number
  /** Minutes burned before a screen-out lands. */
  screenerMinutes: number
  /**
   * Roughly how many surveys you can actually complete per week here.
   *
   * Without this, a platform paying a great rate on two surveys a week
   * outranks one paying half as much on twenty — which would be exactly
   * backwards for anyone trying to reach a gift card.
   */
  typicalSurveysPerWeek: number

  // --- getting paid --------------------------------------------------------
  minCashoutUsd: number
  payoutSpeed: PayoutSpeed
  /** Gift cards you can redeem for. 'PayPal' and 'Cash' listed where offered. */
  giftCards: string[]
  regions: string[]
  /** True when you cannot simply sign up — invitation, screening or waitlist. */
  inviteOnly: boolean
  mobileOnly: boolean
  /** The catch, in plain language. Every platform has one. */
  notes: string
}

/** Computed economics for a panel. Everything here is derived, never asserted. */
export interface PanelEconomics {
  /** Dollars per completed survey. */
  usdPerSurvey: number
  /**
   * Expected minutes invested per completion, including time lost to
   * screen-outs. The honest cost, not the advertised survey length.
   */
  effectiveMinutesPerSurvey: number
  /** The headline number: expected dollars per hour of actual attention. */
  effectiveHourlyUsd: number
  /** Advertised rate if you never got screened out, for comparison. */
  nominalHourlyUsd: number
  /** Completions needed to reach the payout threshold. */
  surveysToMinCashout: number
  /** Hours to the payout threshold, screen-outs included. */
  hoursToMinCashout: number
  /**
   * What this platform can actually yield in a week at its real survey volume.
   * A high hourly rate on a platform that offers two surveys a week is not
   * income, and this is the number that says so.
   */
  realisticWeeklyUsd: number
}

/** What it takes to reach a specific gift card on this panel. */
export interface TargetPlan {
  targetUsd: number
  surveysNeeded: number
  hoursNeeded: number
  /**
   * Calendar weeks to get there at this platform's actual survey volume,
   * which is usually the binding constraint rather than your free time.
   */
  weeksNeeded: number
  /** False when the target sits below the platform's cash-out minimum. */
  reachable: boolean
  blockedReason?: string
}

export interface LivenessCheck {
  ok: boolean
  status?: number
  error?: string
  snippet?: string
  checkedAt: string
}

export interface RiskAssessment {
  score: number
  level: 'clean' | 'caution' | 'blocked'
  reasons: string[]
}

export interface PanelResult {
  panel: SurveyPanel
  economics: PanelEconomics
  /** Present when the scan was given a target gift card value. */
  plan?: TargetPlan
  liveness: LivenessCheck
  risk: RiskAssessment
  /** 0-100, ranking value for the time it costs. */
  score: number
}

/** A specific open study or offer found while crawling. */
export interface OpportunityResult {
  title: string
  url: string
  panelId: string
  panelName: string
  /** Payout in USD when the listing states one. */
  payoutUsd?: number
  /** Stated duration in minutes when the listing gives one. */
  minutes?: number
  snippet: string
  risk: RiskAssessment
  score: number
  foundAt: string
}

export interface ScanStats {
  panelsConsidered: number
  panelsReachable: number
  panelsRobotsBlocked: number
  panelsFailed: number
  opportunitiesFound: number
  opportunitiesBlocked: number
  durationMs: number
}

export interface ScanResult {
  scannedAt: string
  stats: ScanStats
  panels: PanelResult[]
  opportunities: OpportunityResult[]
  /** Platforms asking crawlers to stay away. Not a fault, and not a failure. */
  robotsBlocked: { id: string; name: string; url: string }[]
  /** Platforms that genuinely could not be reached. */
  failed: { id: string; name: string; url: string; error: string }[]
  blocked: { title: string; url: string; reasons: string[] }[]
  warnings: string[]
}

export interface ScanOptions {
  region?: string
  /** Gift card value you are working toward, in USD. Defaults to 25. */
  targetUsd?: number
  /** Drop panels earning below this expected hourly rate. */
  minHourlyUsd?: number
  /** Exclude platforms you cannot simply sign up for. */
  excludeInviteOnly?: boolean
  /** Restrict to a kind of work, e.g. only paid research studies. */
  kind?: PanelKind
  /** Only panels redeemable for this gift card brand. */
  brand?: string
  /** Skip crawling for individual open studies. */
  panelsOnly?: boolean
  limit?: number
  timeoutMs?: number
  concurrency?: number
  offline?: boolean
  /** Overrides the catalog. Used by tests. */
  panels?: SurveyPanel[]
}
