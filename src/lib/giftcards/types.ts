// Shared types for the gift card finder.

/** How a source is used by the scanner. */
export type SourceKind =
  /** A standing earning program (rewards site, cashback app, loyalty scheme). */
  | 'program'
  /** A page or feed crawled for time-sensitive, expiring offers. */
  | 'feed'

export type EarnCategory =
  | 'rewards-program'
  | 'cashback'
  | 'survey-gpt'
  | 'receipt-scanning'
  | 'loyalty'
  | 'bank-credit'
  | 'deal-feed'

/** How much of your attention the method actually costs. */
export type EffortLevel = 'passive' | 'low' | 'medium' | 'high'

export interface GiftCardSource {
  id: string
  name: string
  kind: SourceKind
  category: EarnCategory
  /** Canonical first-party URL, used for both liveness checks and attribution. */
  url: string
  /** Extra pages crawled for expiring offers. Only used for `feed` sources. */
  discoveryUrls?: string[]
  /** How to turn a fetched discovery URL into offer candidates. Defaults to 'html'. */
  parser?: 'html' | 'reddit-json'
  /** Gift card brands typically redeemable through this source. */
  brands: string[]
  /** Country codes where the program operates. 'WW' means broadly worldwide. */
  regions: string[]
  effort: EffortLevel
  /** Realistic monthly USD value [low, high] for someone using it consistently. */
  monthlyValueUsd: [number, number]
  /**
   * Rough one-off upside for methods that do not recur, amortised over a year
   * for ranking purposes only. Never shown as a promise of what you will get.
   */
  oneTimeUpsideUsd?: number
  /** Minimum balance before you can cash out, if any. */
  payoutThresholdUsd?: number
  /** True when you have to spend money first (cashback, loyalty, card rewards). */
  requiresPurchase: boolean
  /** Plain-language description of the catch. Every one of these has a catch. */
  notes: string
}

/** Verdict from the scam heuristics in `scam-filter.ts`. */
export interface RiskAssessment {
  /** 0 (clean) to 100 (almost certainly a scam). */
  score: number
  /** 'blocked' results are withheld from the offer list entirely. */
  level: 'clean' | 'caution' | 'blocked'
  reasons: string[]
}

/** Result of checking whether a source is actually reachable right now. */
export interface LivenessCheck {
  ok: boolean
  status?: number
  /** Set when the fetch failed or was skipped. */
  error?: string
  /** Text pulled from the live page, used to surface current terms. */
  snippet?: string
  checkedAt: string
}

/** A standing program, enriched with a live check and effort/value scoring. */
export interface ProgramResult {
  source: GiftCardSource
  liveness: LivenessCheck
  /** 0-100. Higher means better return for the effort and risk involved. */
  score: number
  risk: RiskAssessment
}

/** A time-sensitive offer scraped from a feed source. */
export interface OfferResult {
  title: string
  url: string
  sourceId: string
  sourceName: string
  /** Face value in USD when the text states one. */
  valueUsd?: number
  brands: string[]
  snippet: string
  score: number
  risk: RiskAssessment
  foundAt: string
}

export interface ScanStats {
  sourcesConsidered: number
  sourcesFetched: number
  sourcesUnreachable: number
  offersFound: number
  offersBlocked: number
  durationMs: number
}

export interface ScanResult {
  scannedAt: string
  stats: ScanStats
  programs: ProgramResult[]
  offers: OfferResult[]
  /** Sources that could not be reached, so results are never silently thinned. */
  unreachable: { id: string; name: string; url: string; error: string }[]
  /** Scam candidates that were filtered out, kept for transparency. */
  blocked: { title: string; url: string; reasons: string[] }[]
  /** Non-fatal notes about the run, e.g. web search being unconfigured. */
  warnings: string[]
}

export interface ScanOptions {
  /** Restrict to sources operating in this country code, e.g. 'US'. */
  region?: string
  /** Drop anything requiring more effort than this. */
  maxEffort?: EffortLevel
  /** Exclude programs that require spending money first. */
  noPurchaseOnly?: boolean
  /** Skip crawling `feed` sources; only check standing programs. */
  programsOnly?: boolean
  /** Cap on offers returned. Defaults to 40. */
  limit?: number
  /** Per-request timeout in ms. Defaults to 8000. */
  timeoutMs?: number
  /** Parallel fetches. Defaults to 5. */
  concurrency?: number
  /** Skip all network access and return the curated catalog unverified. */
  offline?: boolean
  /** Overrides the curated catalog. Used by tests; defaults to `SOURCES`. */
  sources?: GiftCardSource[]
}
