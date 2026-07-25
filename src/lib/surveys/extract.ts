/**
 * Turning fetched pages into offer candidates.
 *
 * Deliberately regex-based rather than a DOM parser: the scanner only needs
 * link text and dollar amounts, and that is not worth a dependency that has to
 * be kept patched.
 */

/** Words marking a line as being about paid research or earning at all. */
const EARNING_SIGNAL =
  /\b(survey|surveys|study|studies|research|panel|focus\s+group|user\s+test(ing)?|interview|questionnaire|task|gift\s*cards?)\b/i

/** Words suggesting there is actually money attached. */
const COMPENSATION_SIGNAL =
  /\b(paid|pays?|paying|earn|earning|compensat\w+|reward|incentive|paypal|gift\s*card|\$\d|paid\s+out)\b/i

const BRAND_NAMES = [
  'Amazon', 'Walmart', 'Target', 'Starbucks', 'Best Buy', 'Home Depot', 'Lowe\'s',
  'Costco', 'Kroger', 'CVS', 'Walgreens', 'Sephora', 'Nike', 'Apple', 'Google Play',
  'Xbox', 'PlayStation', 'Nintendo', 'Steam', 'Netflix', 'Spotify', 'Uber', 'DoorDash',
  'Visa', 'Mastercard', 'PayPal', 'Airbnb', 'Sam\'s Club', 'Nordstrom', 'Macy\'s',
  'Chipotle', 'Dunkin', 'Subway', 'Instacart', 'Lyft', 'Southwest', 'Delta',
]

export interface OfferCandidate {
  title: string
  url: string
  /** Surrounding text used for risk assessment and display. */
  context: string
  /**
   * True when the context is the offer's own copy rather than whatever happened
   * to be printed next to it on a listing page. Drives how heavily the scam
   * filter weights it.
   */
  contextIsOwned?: boolean
}

const BLOCK_TAGS = /<(script|style|noscript|template|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi

/** Strips markup and collapses whitespace, leaving readable prose. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(BLOCK_TAGS, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    const named = NAMED_ENTITIES[entity.toLowerCase()]
    if (named !== undefined) return named
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match
    }
    return match
  })
}

function safeFromCodePoint(code: number, fallback: string): string {
  if (code < 0 || code > 0x10ffff) return fallback
  try {
    return String.fromCodePoint(code)
  } catch {
    return fallback
  }
}

/** True when a line plausibly describes paid research you could take part in. */
export function looksLikeEarningOpportunity(text: string): boolean {
  return EARNING_SIGNAL.test(text) && COMPENSATION_SIGNAL.test(text)
}

/**
 * Reads a stated duration in minutes, e.g. "20 min", "1 hour", "45-minute".
 * Used to turn a payout into an implied hourly rate.
 */
export function extractMinutes(text: string): number | undefined {
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:-|\s)?\s*(?:hours?|hrs?|h)\b/i)
  if (hours) {
    const value = Number.parseFloat(hours[1])
    if (Number.isFinite(value) && value > 0 && value <= 24) return Math.round(value * 60)
  }

  const minutes = text.match(/(\d{1,3})\s*(?:-|\s)?\s*(?:minutes?|mins?|m)\b/i)
  if (minutes) {
    const value = Number.parseInt(minutes[1], 10)
    if (Number.isFinite(value) && value > 0 && value <= 600) return value
  }

  return undefined
}

const ANCHOR = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

/**
 * Pulls linked headlines that read like paid studies or survey offers.
 *
 * @param html     Raw page markup.
 * @param baseUrl  Used to resolve relative hrefs.
 */
export function extractOfferCandidates(html: string, baseUrl: string): OfferCandidate[] {
  const plain = htmlToText(html)
  const seen = new Set<string>()
  const candidates: OfferCandidate[] = []

  for (const match of html.matchAll(ANCHOR)) {
    const href = match[1]
    const title = htmlToText(match[2])

    if (title.length < 12 || title.length > 220) continue
    if (!looksLikeEarningOpportunity(title)) continue

    const url = resolveUrl(href, baseUrl)
    if (!url) continue

    const key = `${title.toLowerCase()}|${url}`
    if (seen.has(key)) continue
    seen.add(key)

    candidates.push({ title, url, context: contextAround(plain, title) })
  }

  return candidates
}

/** Parses a Reddit `.json` listing into candidates. */
export function parseRedditListing(body: string, fallbackUrl: string): OfferCandidate[] {
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return []
  }

  const children = readPath(payload, ['data', 'children'])
  if (!Array.isArray(children)) return []

  const candidates: OfferCandidate[] = []
  for (const child of children) {
    const post = readPath(child, ['data'])
    if (!post || typeof post !== 'object') continue

    const record = post as Record<string, unknown>
    const title = typeof record.title === 'string' ? record.title : ''
    if (!title || !looksLikeEarningOpportunity(title)) continue

    const permalink = typeof record.permalink === 'string' ? record.permalink : ''
    // `url` is where the post points; the permalink is the discussion, which is
    // the safer thing to hand a reader.
    const url = permalink ? `https://www.reddit.com${permalink}` : fallbackUrl
    const selftext = typeof record.selftext === 'string' ? record.selftext : ''
    const linkTarget = typeof record.url === 'string' ? record.url : ''

    candidates.push({
      title,
      url,
      context: [selftext.slice(0, 400), linkTarget].filter(Boolean).join(' '),
      contextIsOwned: true,
    })
  }

  return candidates
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export function resolveUrl(href: string, baseUrl: string): string | undefined {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#') || /^(javascript|mailto|tel|data):/i.test(trimmed)) {
    return undefined
  }
  try {
    const resolved = new URL(trimmed, baseUrl)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return undefined
    return resolved.toString()
  } catch {
    return undefined
  }
}

/** Grabs the sentence-ish window around a phrase, for display and risk scoring. */
export function contextAround(plain: string, phrase: string, radius = 160): string {
  const index = plain.toLowerCase().indexOf(phrase.toLowerCase())
  if (index < 0) return phrase
  const start = Math.max(0, index - radius)
  const end = Math.min(plain.length, index + phrase.length + radius)
  return plain.slice(start, end).trim()
}

/**
 * Reads a payout like "$75 for a 1-hour interview" out of free text.
 *
 * Takes the smallest figure quoted, which is the conservative reading of a
 * range like "$40-$75" and of "spend $50, get $10" phrasing alike.
 */
export function extractValueUsd(text: string): number | undefined {
  const amounts: number[] = []
  for (const match of text.matchAll(/\$\s?(\d{1,4}(?:,\d{3})*)(?:\.(\d{2}))?\b/g)) {
    const whole = Number.parseInt(match[1].replace(/,/g, ''), 10)
    const cents = match[2] ? Number.parseInt(match[2], 10) / 100 : 0
    if (Number.isFinite(whole)) amounts.push(whole + cents)
  }
  if (amounts.length === 0) return undefined
  // Offers usually quote the spend first and the reward second; the smaller
  // number is the card far more often than not.
  return Math.min(...amounts)
}

/** Finds retailer names mentioned in the text. */
export function detectBrands(text: string): string[] {
  const found = BRAND_NAMES.filter((brand) => {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
  })
  return Array.from(new Set(found))
}

/** Shortens text for display without cutting mid-word. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
