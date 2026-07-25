/**
 * Small, dependency-free HTTP layer for the scanner.
 *
 * The scanner reads other people's sites, so it behaves like a guest: it
 * identifies itself, honours robots.txt, caps concurrency, and gives up quickly
 * rather than hanging on a slow host.
 */

export const USER_AGENT =
  'AutoRevenueHubGiftCardFinder/1.0 (+https://github.com/steve1603/autorevenue-hub)'

export interface FetchResult {
  ok: boolean
  status?: number
  text?: string
  error?: string
  finalUrl?: string
}

export interface FetchOptions {
  timeoutMs?: number
  /** Cap on response size read into memory. Defaults to 2 MB. */
  maxBytes?: number
  /** Set false to skip the robots.txt lookup (used by the robots fetch itself). */
  respectRobots?: boolean
}

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024

export async function fetchText(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    respectRobots = true,
  } = options

  if (respectRobots) {
    const allowed = await isAllowedByRobots(url, timeoutMs)
    if (!allowed) {
      return { ok: false, error: 'Disallowed by robots.txt' }
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}`, finalUrl: response.url }
    }

    const text = await readCapped(response, maxBytes)
    return { ok: true, status: response.status, text, finalUrl: response.url }
  } catch (error) {
    return { ok: false, error: describeError(error, timeoutMs) }
  } finally {
    clearTimeout(timer)
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const body = response.body
  if (!body) return await response.text()

  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let received = 0
  let text = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      received += value.byteLength
      if (received >= maxBytes) {
        const remaining = value.byteLength - (received - maxBytes)
        text += decoder.decode(value.subarray(0, Math.max(0, remaining)))
        break
      }
      text += decoder.decode(value, { stream: true })
    }
  } finally {
    // Releases the connection whether we read it all or bailed out at the cap.
    await reader.cancel().catch(() => {})
  }

  return text
}

function describeError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return `Timed out after ${timeoutMs}ms`
    }
    return error.message
  }
  return 'Unknown fetch error'
}

// --------------------------------------------------------------- robots.txt

interface RobotsRules {
  /** Path prefixes we must not fetch. Empty means everything is allowed. */
  disallow: string[]
  /** Explicit allows, which win over a disallow when they are more specific. */
  allow: string[]
}

const robotsCache = new Map<string, Promise<RobotsRules>>()

/** Clears the robots cache. Exposed for tests and long-lived processes. */
export function clearRobotsCache(): void {
  robotsCache.clear()
}

export async function isAllowedByRobots(url: string, timeoutMs: number): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const origin = parsed.origin
  let pending = robotsCache.get(origin)
  if (!pending) {
    pending = loadRobots(origin, timeoutMs)
    robotsCache.set(origin, pending)
  }

  const rules = await pending
  const path = parsed.pathname + parsed.search

  const longestMatch = (patterns: string[]): number =>
    patterns.reduce((best, prefix) => (path.startsWith(prefix) ? Math.max(best, prefix.length) : best), -1)

  const disallowed = longestMatch(rules.disallow)
  if (disallowed < 0) return true
  return longestMatch(rules.allow) >= disallowed
}

async function loadRobots(origin: string, timeoutMs: number): Promise<RobotsRules> {
  // A missing or unreadable robots.txt means "no restrictions stated".
  const result = await fetchText(`${origin}/robots.txt`, {
    timeoutMs,
    maxBytes: 128 * 1024,
    respectRobots: false,
  })
  if (!result.ok || !result.text) return { disallow: [], allow: [] }
  return parseRobots(result.text)
}

/**
 * Parses the subset of the robots.txt grammar that matters here: the `*` group
 * and any group naming this crawler. Wildcards inside paths are not expanded —
 * a `*` is treated as the end of a prefix, which errs toward not fetching.
 */
export function parseRobots(body: string): RobotsRules {
  const disallow: string[] = []
  const allow: string[] = []

  let groupApplies = false
  let inGroup = false

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue

    const separator = line.indexOf(':')
    if (separator < 0) continue
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      // Consecutive user-agent lines share one group of rules.
      if (!inGroup) {
        groupApplies = false
        inGroup = true
      }
      const agent = value.toLowerCase()
      if (agent === '*' || USER_AGENT.toLowerCase().startsWith(agent.split('/')[0])) {
        groupApplies = true
      }
      continue
    }

    inGroup = false
    if (!groupApplies) continue

    if (field === 'disallow') {
      if (value === '') continue // "Disallow:" with no value allows everything.
      disallow.push(truncateAtWildcard(value))
    } else if (field === 'allow') {
      if (value === '') continue
      allow.push(truncateAtWildcard(value))
    }
  }

  return { disallow, allow }
}

function truncateAtWildcard(path: string): string {
  const wildcard = path.indexOf('*')
  return wildcard < 0 ? path : path.slice(0, wildcard)
}

// -------------------------------------------------------------- concurrency

/** Runs `worker` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}
