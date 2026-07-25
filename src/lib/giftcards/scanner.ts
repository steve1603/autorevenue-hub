import { fetchText, mapWithConcurrency } from './fetcher.ts'
import {
  detectBrands,
  extractOfferCandidates,
  extractValueUsd,
  htmlToText,
  looksLikeGiftCardOffer,
  parseRedditListing,
  truncate,
  type OfferCandidate,
} from './extract.ts'
import { assessOfferRisk, assessRisk } from './scam-filter.ts'
import { EFFORT_ORDER, scoreOffer, scoreProgram } from './score.ts'
import { SOURCES } from './sources.ts'
import type {
  GiftCardSource,
  LivenessCheck,
  OfferResult,
  ProgramResult,
  ScanOptions,
  ScanResult,
} from './types.ts'

const DEFAULT_LIMIT = 40
// Large retailer homepages are slow; 8s was cutting some of them off.
const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_CONCURRENCY = 5

/** Queries used when a web search key is configured. */
const DISCOVERY_QUERIES = [
  'free gift card promotion site:.com -generator',
  'gift card with purchase promotion this week',
  'earn gift cards rewards program legitimate',
  'class action settlement gift card claim',
]

/**
 * Runs a full sweep: verifies the curated programs are live, crawls the deal
 * feeds for expiring offers, optionally widens the net with a web search, and
 * filters the whole lot through the scam heuristics.
 */
export async function scan(options: ScanOptions = {}): Promise<ScanResult> {
  const started = Date.now()
  const {
    region,
    maxEffort,
    noPurchaseOnly = false,
    programsOnly = false,
    limit = DEFAULT_LIMIT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    concurrency = DEFAULT_CONCURRENCY,
    offline = false,
    sources = SOURCES,
  } = options

  const warnings: string[] = []
  const unreachable: ScanResult['unreachable'] = []
  const blocked: ScanResult['blocked'] = []

  const selected = sources.filter((source) => matchesFilters(source, { region, maxEffort, noPurchaseOnly }))

  if (offline) {
    warnings.push('Offline mode: the catalog is returned without verifying that any source is reachable.')
  }

  // ------------------------------------------------------------- programs
  const programSources = selected.filter((source) => source.kind === 'program')
  const programs = await mapWithConcurrency(programSources, concurrency, async (source) => {
    const liveness = offline
      ? { ok: false, error: 'Skipped (offline mode)', checkedAt: new Date().toISOString() }
      : await checkLiveness(source, timeoutMs)

    if (!liveness.ok && !offline) {
      unreachable.push({
        id: source.id,
        name: source.name,
        url: source.url,
        error: liveness.error ?? 'Unknown error',
      })
    }

    const risk = assessRisk(`${source.name} ${source.notes} ${liveness.snippet ?? ''}`, source.url)
    return {
      source,
      liveness,
      risk,
      score: scoreProgram(source, liveness, risk),
    } satisfies ProgramResult
  })

  programs.sort((a, b) => b.score - a.score)

  // --------------------------------------------------------------- offers
  const offers: OfferResult[] = []
  let sourcesFetched = programs.filter((program) => program.liveness.ok).length

  if (!programsOnly && !offline) {
    const feedSources = selected.filter((source) => source.kind === 'feed')

    const crawled = await mapWithConcurrency(feedSources, concurrency, async (source) => {
      const urls = source.discoveryUrls ?? [source.url]
      const collected: OfferResult[] = []

      for (const url of urls) {
        const response = await fetchText(url, { timeoutMs })
        if (!response.ok || !response.text) {
          unreachable.push({
            id: source.id,
            name: source.name,
            url,
            error: response.error ?? 'Unknown error',
          })
          continue
        }
        sourcesFetched += 1

        const candidates =
          source.parser === 'reddit-json'
            ? parseRedditListing(response.text, url)
            : extractOfferCandidates(response.text, response.finalUrl ?? url)

        for (const candidate of candidates) {
          const offer = buildOffer(candidate, source)
          if (offer.risk.level === 'blocked') {
            blocked.push({ title: offer.title, url: offer.url, reasons: offer.risk.reasons })
            continue
          }
          collected.push(offer)
        }
      }

      return collected
    })

    for (const batch of crawled) offers.push(...batch)

    const discovered = await discoverViaWebSearch(timeoutMs, warnings)
    for (const candidate of discovered) {
      const offer = buildOffer(candidate.candidate, candidate.pseudoSource)
      if (offer.risk.level === 'blocked') {
        blocked.push({ title: offer.title, url: offer.url, reasons: offer.risk.reasons })
        continue
      }
      offers.push(offer)
    }
  } else if (programsOnly) {
    warnings.push('Feed crawling was skipped (programs-only run).')
  }

  const ranked = dedupeOffers(offers)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))

  return {
    scannedAt: new Date().toISOString(),
    stats: {
      sourcesConsidered: selected.length,
      sourcesFetched,
      sourcesUnreachable: unreachable.length,
      offersFound: ranked.length,
      offersBlocked: blocked.length,
      durationMs: Date.now() - started,
    },
    programs,
    offers: ranked,
    unreachable,
    blocked,
    warnings,
  }
}

function matchesFilters(
  source: GiftCardSource,
  filters: { region?: string; maxEffort?: ScanOptions['maxEffort']; noPurchaseOnly: boolean },
): boolean {
  if (filters.region) {
    const wanted = filters.region.toUpperCase()
    const operates = source.regions.some((code) => code === 'WW' || code.toUpperCase() === wanted)
    if (!operates) return false
  }
  if (filters.maxEffort && EFFORT_ORDER[source.effort] > EFFORT_ORDER[filters.maxEffort]) return false
  if (filters.noPurchaseOnly && source.requiresPurchase) return false
  return true
}

async function checkLiveness(source: GiftCardSource, timeoutMs: number): Promise<LivenessCheck> {
  const checkedAt = new Date().toISOString()
  const response = await fetchText(source.url, { timeoutMs })

  if (!response.ok) {
    return { ok: false, status: response.status, error: response.error, checkedAt }
  }

  const text = htmlToText(response.text ?? '')
  return { ok: true, status: response.status, snippet: truncate(text, 280), checkedAt }
}

function buildOffer(candidate: OfferCandidate, source: GiftCardSource): OfferResult {
  const risk = assessOfferRisk({
    title: candidate.title,
    url: candidate.url,
    context: candidate.context,
    contextIsOwned: candidate.contextIsOwned,
  })

  // Prefer what the offer says about itself; fall back to the surrounding copy
  // only when the title names nothing.
  const titleBrands = detectBrands(candidate.title)
  const brands = titleBrands.length > 0 ? titleBrands : detectBrands(candidate.context)
  const valueUsd = extractValueUsd(candidate.title) ?? extractValueUsd(candidate.context)

  return {
    title: truncate(candidate.title, 160),
    url: candidate.url,
    sourceId: source.id,
    sourceName: source.name,
    valueUsd,
    brands,
    snippet: truncate(candidate.context, 240),
    risk,
    score: scoreOffer({ valueUsd, brands, risk, sourceEffort: source.effort }),
    foundAt: new Date().toISOString(),
  }
}

function dedupeOffers(offers: OfferResult[]): OfferResult[] {
  const byKey = new Map<string, OfferResult>()
  for (const offer of offers) {
    const key = `${normaliseUrl(offer.url)}|${offer.title.toLowerCase()}`
    const existing = byKey.get(key)
    if (!existing || offer.score > existing.score) byKey.set(key, offer)
  }
  return Array.from(byKey.values())
}

function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    // Affiliate and campaign parameters differ between listings of the same deal.
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|ref|referrer|affiliate|aff|tag|campaign)/i.test(key)) parsed.searchParams.delete(key)
    }
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// ----------------------------------------------------------- web discovery

interface DiscoveredCandidate {
  candidate: OfferCandidate
  pseudoSource: GiftCardSource
}

/**
 * Widens the sweep beyond the curated feeds using the Brave Search API.
 *
 * This is opt-in: without `BRAVE_SEARCH_API_KEY` the scan still works, it just
 * covers the curated sources only, and says so in the warnings.
 */
async function discoverViaWebSearch(
  timeoutMs: number,
  warnings: string[],
): Promise<DiscoveredCandidate[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    warnings.push(
      'Open web search is off. Set BRAVE_SEARCH_API_KEY to search beyond the curated sources.',
    )
    return []
  }

  const pseudoSource: GiftCardSource = {
    id: 'web-search',
    name: 'Open web search',
    kind: 'feed',
    category: 'deal-feed',
    url: 'https://search.brave.com/',
    brands: [],
    regions: ['WW'],
    effort: 'medium',
    monthlyValueUsd: [0, 0],
    requiresPurchase: false,
    notes: 'Unvetted search results. Risk scoring matters most here.',
  }

  const found: DiscoveredCandidate[] = []

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
        if (!looksLikeGiftCardOffer(`${result.title} ${context}`)) continue
        found.push({
          candidate: { title: result.title, url: result.url, context },
          pseudoSource,
        })
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
