import { fetchText, mapWithConcurrency } from './fetcher.ts'
import {
  extractMinutes,
  extractOfferCandidates,
  extractValueUsd,
  htmlToText,
  looksLikeEarningOpportunity,
  parseRedditListing,
  truncate,
  type OfferCandidate,
} from './extract.ts'
import { assessOfferRisk, assessRisk } from './scam-filter.ts'
import { computeEconomics, planForTarget, scorePanel } from './earnings.ts'
import { PANELS, isDiscoveryFeed } from './panels.ts'
import type {
  LivenessCheck,
  OpportunityResult,
  PanelResult,
  ScanOptions,
  ScanResult,
  SurveyPanel,
} from './types.ts'

const DEFAULT_LIMIT = 40
const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_CONCURRENCY = 5
const DEFAULT_TARGET_USD = 25

const DISCOVERY_QUERIES = [
  'paid research study participants wanted compensation gift card',
  'user research study participants paid this week',
  'paid survey panel legitimate payout review',
]

/**
 * Ranks survey platforms by what they actually pay for your time, and crawls
 * for individual open studies worth applying to.
 */
export async function scan(options: ScanOptions = {}): Promise<ScanResult> {
  const started = Date.now()
  const {
    region,
    targetUsd = DEFAULT_TARGET_USD,
    minHourlyUsd,
    excludeInviteOnly = false,
    kind,
    brand,
    panelsOnly = false,
    limit = DEFAULT_LIMIT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    concurrency = DEFAULT_CONCURRENCY,
    offline = false,
    panels: catalog = PANELS,
  } = options

  const warnings: string[] = []
  const robotsBlocked: ScanResult['robotsBlocked'] = []
  const failed: ScanResult['failed'] = []
  const blocked: ScanResult['blocked'] = []

  if (offline) {
    warnings.push('Offline mode: rankings are computed, but no platform was checked as reachable.')
  }

  const selected = catalog.filter((panel) =>
    matchesFilters(panel, { region, minHourlyUsd, excludeInviteOnly, kind, brand }),
  )

  // ---------------------------------------------------------------- panels
  const earning = selected.filter((panel) => !isDiscoveryFeed(panel))

  const results = await mapWithConcurrency(earning, concurrency, async (panel) => {
    const liveness = offline
      ? { ok: false, error: 'Skipped (offline mode)', checkedAt: new Date().toISOString() }
      : await checkLiveness(panel, timeoutMs)

    if (!offline && !liveness.ok) {
      recordUnreachable(panel, panel.url, liveness.error ?? 'Unknown error', robotsBlocked, failed)
    }

    const economics = computeEconomics(panel)
    const risk = assessRisk(`${panel.name} ${panel.notes} ${liveness.snippet ?? ''}`, panel.url)

    return {
      panel,
      economics,
      plan: planForTarget(panel, targetUsd),
      liveness,
      risk,
      score: scorePanel(panel, economics, liveness, risk),
    } satisfies PanelResult
  })

  results.sort((a, b) => b.score - a.score)

  // --------------------------------------------------------- opportunities
  const opportunities: OpportunityResult[] = []

  if (!panelsOnly && !offline) {
    const feeds = selected.filter((panel) => (panel.discoveryUrls?.length ?? 0) > 0)

    const crawled = await mapWithConcurrency(feeds, concurrency, async (panel) => {
      const found: OpportunityResult[] = []

      for (const url of panel.discoveryUrls ?? []) {
        const response = await fetchText(url, { timeoutMs })
        if (!response.ok || !response.text) {
          recordUnreachable(panel, url, response.error ?? 'Unknown error', robotsBlocked, failed)
          continue
        }

        const candidates =
          panel.parser === 'reddit-json'
            ? parseRedditListing(response.text, url)
            : extractOfferCandidates(response.text, response.finalUrl ?? url)

        for (const candidate of candidates) {
          const opportunity = buildOpportunity(candidate, panel)
          if (opportunity.risk.level === 'blocked') {
            blocked.push({
              title: opportunity.title,
              url: opportunity.url,
              reasons: opportunity.risk.reasons,
            })
            continue
          }
          found.push(opportunity)
        }
      }

      return found
    })

    for (const batch of crawled) opportunities.push(...batch)

    for (const discovered of await discoverViaWebSearch(timeoutMs, warnings)) {
      const opportunity = buildOpportunity(discovered.candidate, discovered.pseudoPanel)
      if (opportunity.risk.level === 'blocked') {
        blocked.push({
          title: opportunity.title,
          url: opportunity.url,
          reasons: opportunity.risk.reasons,
        })
        continue
      }
      opportunities.push(opportunity)
    }
  } else if (panelsOnly) {
    warnings.push('Open-study discovery was skipped (panels-only run).')
  }

  const ranked = dedupe(opportunities)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))

  return {
    scannedAt: new Date().toISOString(),
    stats: {
      panelsConsidered: selected.length,
      panelsReachable: results.filter((result) => result.liveness.ok).length,
      panelsRobotsBlocked: robotsBlocked.length,
      panelsFailed: failed.length,
      opportunitiesFound: ranked.length,
      opportunitiesBlocked: blocked.length,
      durationMs: Date.now() - started,
    },
    panels: results,
    opportunities: ranked,
    robotsBlocked,
    failed,
    blocked,
    warnings,
  }
}

/** A site banning crawlers is not a site that is down; they are kept apart. */
function recordUnreachable(
  panel: SurveyPanel,
  url: string,
  error: string,
  robotsBlocked: ScanResult['robotsBlocked'],
  failed: ScanResult['failed'],
): void {
  if (/robots\.txt/i.test(error)) {
    robotsBlocked.push({ id: panel.id, name: panel.name, url })
  } else {
    failed.push({ id: panel.id, name: panel.name, url, error })
  }
}

function matchesFilters(
  panel: SurveyPanel,
  filters: {
    region?: string
    minHourlyUsd?: number
    excludeInviteOnly: boolean
    kind?: ScanOptions['kind']
    brand?: string
  },
): boolean {
  if (filters.region) {
    const wanted = filters.region.toUpperCase()
    if (!panel.regions.some((code) => code === 'WW' || code.toUpperCase() === wanted)) return false
  }
  if (filters.kind && panel.kind !== filters.kind) return false
  if (filters.excludeInviteOnly && panel.inviteOnly) return false

  if (filters.brand) {
    const wanted = filters.brand.toLowerCase()
    if (!panel.giftCards.some((card) => card.toLowerCase().includes(wanted))) return false
  }

  // Discovery feeds have no hourly rate to compare, so they survive this filter.
  if (filters.minHourlyUsd !== undefined && !isDiscoveryFeed(panel)) {
    if (computeEconomics(panel).effectiveHourlyUsd < filters.minHourlyUsd) return false
  }

  return true
}

async function checkLiveness(panel: SurveyPanel, timeoutMs: number): Promise<LivenessCheck> {
  const checkedAt = new Date().toISOString()
  const response = await fetchText(panel.url, { timeoutMs })

  if (!response.ok) {
    return { ok: false, status: response.status, error: response.error, checkedAt }
  }
  return {
    ok: true,
    status: response.status,
    snippet: truncate(htmlToText(response.text ?? ''), 280),
    checkedAt,
  }
}

function buildOpportunity(candidate: OfferCandidate, panel: SurveyPanel): OpportunityResult {
  const risk = assessOfferRisk({
    title: candidate.title,
    url: candidate.url,
    context: candidate.context,
    contextIsOwned: candidate.contextIsOwned,
  })

  const payoutUsd = extractValueUsd(candidate.title) ?? extractValueUsd(candidate.context)
  const minutes = extractMinutes(candidate.title) ?? extractMinutes(candidate.context)

  return {
    title: truncate(candidate.title, 160),
    url: candidate.url,
    panelId: panel.id,
    panelName: panel.name,
    payoutUsd,
    minutes,
    snippet: truncate(candidate.context, 240),
    risk,
    score: scoreOpportunity({ payoutUsd, minutes, riskScore: risk.score }),
    foundAt: new Date().toISOString(),
  }
}

/**
 * Ranks a one-off listing. An implied hourly rate beats a big headline number,
 * so a $40 study taking 20 minutes outranks a $60 one that takes three hours.
 */
function scoreOpportunity(input: {
  payoutUsd?: number
  minutes?: number
  riskScore: number
}): number {
  let score = 40

  if (input.payoutUsd !== undefined) {
    score += Math.min(20, input.payoutUsd / 4)
    if (input.minutes !== undefined && input.minutes > 0) {
      const impliedHourly = input.payoutUsd * (60 / input.minutes)
      score += Math.min(20, impliedHourly / 3)
    }
  }

  score -= input.riskScore * 0.45
  return Math.max(0, Math.min(100, Math.round(score)))
}

function dedupe(items: OpportunityResult[]): OpportunityResult[] {
  const byKey = new Map<string, OpportunityResult>()
  for (const item of items) {
    const key = `${normaliseUrl(item.url)}|${item.title.toLowerCase()}`
    const existing = byKey.get(key)
    if (!existing || item.score > existing.score) byKey.set(key, item)
  }
  return Array.from(byKey.values())
}

function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|ref|referrer|affiliate|aff|tag|campaign)/i.test(key)) parsed.searchParams.delete(key)
    }
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// ----------------------------------------------------------- web discovery

interface Discovered {
  candidate: OfferCandidate
  pseudoPanel: SurveyPanel
}

async function discoverViaWebSearch(timeoutMs: number, warnings: string[]): Promise<Discovered[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    warnings.push(
      'Open web search is off. Set BRAVE_SEARCH_API_KEY to look for studies beyond the curated feeds.',
    )
    return []
  }

  const pseudoPanel: SurveyPanel = {
    id: 'web-search',
    name: 'Open web search',
    kind: 'gpt-router',
    url: 'https://search.brave.com/',
    payoutUnit: 'usd',
    unitsPerDollar: 1,
    typicalUnitsPerSurvey: 0,
    typicalMinutes: 0,
    screenOutRate: 0,
    screenerMinutes: 0,
    typicalSurveysPerWeek: 0,
    minCashoutUsd: 0,
    payoutSpeed: 'days',
    giftCards: [],
    regions: ['WW'],
    inviteOnly: false,
    mobileOnly: false,
    notes: 'Unvetted search results. Risk scoring matters most here.',
  }

  const found: Discovered[] = []

  for (const query of DISCOVERY_QUERIES) {
    const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
      })
      if (!response.ok) {
        warnings.push(`Web search failed for "${query}" (HTTP ${response.status}).`)
        continue
      }

      const payload = (await response.json()) as {
        web?: { results?: { title?: string; url?: string; description?: string }[] }
      }

      for (const result of payload.web?.results ?? []) {
        if (!result.title || !result.url) continue
        const context = htmlToText(result.description ?? '')
        if (!looksLikeEarningOpportunity(`${result.title} ${context}`)) continue
        found.push({ candidate: { title: result.title, url: result.url, context }, pseudoPanel })
      }
    } catch (error) {
      warnings.push(
        `Web search failed for "${query}": ${error instanceof Error ? error.message : 'unknown error'}.`,
      )
    } finally {
      clearTimeout(timer)
    }
  }

  return found
}
