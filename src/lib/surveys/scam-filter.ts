import type { RiskAssessment } from './types.ts'

/**
 * The free-gift-card space is majority fraud, so filtering is a first-class
 * feature rather than a nicety. These heuristics are tuned to be quiet on real
 * retailer promotions and loud on the two things that are always scams:
 * "generators" that claim to mint codes, and pages that harvest personal data
 * in exchange for a card that never arrives.
 */

/** Claims that no honest offer makes. A single hit is disqualifying. */
const FATAL_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(gift\s*card|gift\s*code|code)\s*(generator|gen)\b/i,
    reason: 'Advertises a gift card "generator" — card numbers cannot be generated, only issued',
  },
  {
    pattern: /\bgenerate\s+(free\s+)?(unlimited\s+)?(gift\s*)?(card|code)s?\b/i,
    reason: 'Claims to generate card codes on demand',
  },
  {
    pattern: /\bno\s+(human\s+)?verification\b/i,
    reason: 'Uses the "no human verification" hook, a signature of code-generator scams',
  },
  {
    pattern: /\bunlimited\s+(gift\s*cards?|codes?|balance)\b/i,
    reason: 'Promises unlimited cards or balance',
  },
  {
    pattern: /\b(hack|crack|exploit|glitch|bypass)\w*\s+(gift\s*cards?|codes?|balance|rewards?)\b/i,
    reason: 'Frames the offer as a hack, glitch or bypass',
  },
  {
    pattern: /\b(free\s+)?(gift\s*card|code)s?\s+(hack|generator|glitch)\b/i,
    reason: 'Frames the offer as a hack, glitch or generator',
  },
  {
    pattern: /\b100%\s+(working|legit|guaranteed)\b/i,
    reason: 'Uses "100% working/legit" reassurance language',
  },
  {
    pattern: /\bcarding\b|\bcvv\s+shop\b|\bdumps?\s+(shop|with\s+pin)\b/i,
    reason: 'References stolen card trading',
  },
  // --- survey-specific fraud ---------------------------------------------
  {
    pattern: /\b(registration|membership|starter|activation|processing)\s+fee\b/i,
    reason: 'Charges a fee to join — legitimate panels are always free, they are paying you',
  },
  {
    pattern: /\b(we|you)('ll|\s+will)?\s+(mail|send)\s+you\s+a\s+(cashier'?s?\s+)?check\b/i,
    reason: 'Mail-a-check setup, the signature of the mystery-shopper cheque-cashing scam',
  },
  {
    pattern: /\bevaluate\s+(a\s+)?(money\s+transfer|wire\s+transfer|western\s+union)\b/i,
    reason: 'Asks you to test a money transfer service — this is money laundering, not research',
  },
  {
    pattern: /\b\$\d{3,}\s*(\/|\s+per\s+)(day|survey)\b/i,
    reason: 'Advertises hundreds of dollars per day or per survey, which no panel pays',
  },
]

/** Strong signals. Two of these together are enough to block. */
const HIGH_RISK_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\benter\s+your\s+(ssn|social\s+security)\b|\bsocial\s+security\s+number\b/i,
    reason: 'Asks for a Social Security number',
  },
  {
    pattern: /\bcredit\s+card\s+(required|details|number)\b.{0,60}\b(free|claim|reward)\b/i,
    reason: 'Requires card details to claim something advertised as free',
  },
  {
    pattern: /\b(complete|finish)\s+\d{1,2}\+?\s+(deals?|offers?|surveys?)\b/i,
    reason: 'Multi-offer completion wall — the classic incentive-fraud pattern where the final tier never unlocks',
  },
  {
    pattern: /\bclaim\s+your\s+(free\s+)?\$?\d{2,4}\b/i,
    reason: 'Names a specific large prize you have supposedly already won',
  },
  {
    pattern: /\byou\s+(have\s+been\s+)?(selected|chosen)\b/i,
    reason: 'Claims you were selected — no legitimate program selects strangers for gift cards',
  },
  {
    pattern: /\bspin\s+(the\s+wheel|to\s+win)\b|\bscratch\s+(and|to)\s+win\b/i,
    reason: 'Prize-wheel mechanic used to justify collecting your details',
  },
  {
    pattern: /\b(bank\s+account|routing)\s+number\b/i,
    reason: 'Asks for bank account or routing details — panels pay by PayPal or gift code',
  },
  {
    pattern: /\bno\s+(experience|skills?)\s+(needed|required|necessary)\b.{0,60}\$\d{3,}/i,
    reason: 'Pairs "no experience needed" with a large figure',
  },
  {
    pattern: /\bwork\s+from\s+home\b.{0,40}\b\$\d{3,}\b/i,
    reason: 'Work-from-home pitch attached to an implausible figure',
  },
]

/** Weak signals. Individually meaningless, collectively worth noting. */
const SOFT_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bhurry\b|\bact\s+(now|fast)\b/i, reason: 'Artificial urgency' },
  { pattern: /\bonly\s+\d{1,3}\s+(left|remaining|spots)\b/i, reason: 'Fake scarcity counter' },
  { pattern: /\bno\s+(survey|surveys)\b/i, reason: 'Advertises "no survey", a generator-scam idiom' },
  { pattern: /\bworks?\s+in\s+20\d{2}\b/i, reason: 'Dated "still works" claim' },
]

/** TLDs disproportionately used for throwaway scam hosting. */
const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'click', 'link',
  'work', 'loan', 'download', 'review', 'country', 'stream', 'buzz', 'rest',
])

/** Link shorteners hide the destination, so the destination cannot be assessed. */
const SHORTENER_HOSTS = new Set([
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly',
  'cutt.ly', 'rb.gy', 'shorturl.at', 'rebrand.ly', 'adf.ly', 'bc.vc',
])

/** Brands whose names get borrowed by impersonation pages. */
const IMPERSONATED_BRANDS: { name: string; domains: string[] }[] = [
  { name: 'amazon', domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca'] },
  { name: 'walmart', domains: ['walmart.com'] },
  { name: 'target', domains: ['target.com'] },
  { name: 'starbucks', domains: ['starbucks.com'] },
  { name: 'visa', domains: ['visa.com'] },
  { name: 'paypal', domains: ['paypal.com'] },
  { name: 'steam', domains: ['steampowered.com', 'valvesoftware.com'] },
  { name: 'roblox', domains: ['roblox.com'] },
  { name: 'xbox', domains: ['xbox.com', 'microsoft.com'] },
  { name: 'playstation', domains: ['playstation.com', 'sony.com'] },
  { name: 'netflix', domains: ['netflix.com'] },
  { name: 'apple', domains: ['apple.com'] },
  { name: 'google', domains: ['google.com'] },
  { name: 'nintendo', domains: ['nintendo.com'] },
]

const BLOCK_THRESHOLD = 60
const CAUTION_THRESHOLD = 25

/** Extracts the registrable-ish domain: the last two labels of the hostname. */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/^www\./, '').split('.')
  if (labels.length <= 2) return labels.join('.')
  // Handles the common two-part public suffixes we actually encounter.
  const twoPartSuffix = /^(co|com|org|net|gov|ac)\.[a-z]{2}$/
  const lastTwo = labels.slice(-2).join('.')
  return twoPartSuffix.test(lastTwo) ? labels.slice(-3).join('.') : lastTwo
}

function assessUrl(url: string): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { score: 20, reasons: ['Malformed URL'] }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { score: 100, reasons: [`Non-web URL scheme (${parsed.protocol})`] }
  }
  if (parsed.protocol === 'http:') {
    score += 10
    reasons.push('Served over plain HTTP')
  }

  const host = parsed.hostname.toLowerCase()
  const domain = registrableDomain(host)
  const tld = domain.split('.').pop() ?? ''

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    score += 40
    reasons.push('Bare IP address instead of a domain')
  }
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 25
    reasons.push(`Throwaway top-level domain (.${tld})`)
  }
  if (SHORTENER_HOSTS.has(domain)) {
    score += 20
    reasons.push('Link shortener hides the real destination')
  }
  if (host.startsWith('xn--') || host.includes('.xn--')) {
    score += 30
    reasons.push('Punycode hostname, often used for lookalike domains')
  }

  // Brand name anywhere in the host but not on the brand's own domain.
  for (const brand of IMPERSONATED_BRANDS) {
    if (!host.includes(brand.name)) continue
    const isOfficial = brand.domains.some((d) => domain === d || host.endsWith(`.${d}`))
    if (!isOfficial) {
      score += 35
      reasons.push(`Uses the ${brand.name} name on an unaffiliated domain (${domain})`)
      break
    }
  }

  const hyphens = (domain.match(/-/g) ?? []).length
  if (hyphens >= 3) {
    score += 15
    reasons.push('Heavily hyphenated domain')
  }

  return { score, reasons }
}

/**
 * Scores a candidate offer for fraud risk.
 *
 * @param text  Title plus any surrounding copy.
 * @param url   Destination link, when there is one.
 */
export function assessRisk(text: string, url?: string): RiskAssessment {
  const reasons: string[] = []
  let score = 0

  for (const { pattern, reason } of FATAL_PATTERNS) {
    if (pattern.test(text)) {
      score += 70
      reasons.push(reason)
    }
  }
  for (const { pattern, reason } of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      score += 32
      reasons.push(reason)
    }
  }
  for (const { pattern, reason } of SOFT_PATTERNS) {
    if (pattern.test(text)) {
      score += 8
      reasons.push(reason)
    }
  }

  if (url) {
    const urlRisk = assessUrl(url)
    score += urlRisk.score
    reasons.push(...urlRisk.reasons)
  }

  score = Math.min(100, score)
  const level: RiskAssessment['level'] =
    score >= BLOCK_THRESHOLD ? 'blocked' : score >= CAUTION_THRESHOLD ? 'caution' : 'clean'

  return { score, level, reasons }
}

/**
 * Scores an offer whose surrounding text may not belong to it.
 *
 * Candidates scraped from a listing page carry the copy of whatever was printed
 * next to them, so a single scam listing would otherwise poison every honest
 * offer on the page. Ambient text can therefore raise suspicion but can never
 * block on its own — only the offer's own title and URL can do that.
 *
 * @param contextIsOwned Set when the context genuinely belongs to the offer,
 *                       such as the body of a Reddit post, in which case it is
 *                       treated with full weight.
 */
export function assessOfferRisk(input: {
  title: string
  url?: string
  context?: string
  contextIsOwned?: boolean
}): RiskAssessment {
  const { title, url, context = '', contextIsOwned = false } = input

  if (contextIsOwned) return assessRisk(`${title} ${context}`, url)

  const primary = assessRisk(title, url)
  if (!context.trim()) return primary

  const ambient = assessRisk(context)
  if (ambient.score === 0) return primary

  const bonus = Math.min(15, Math.round(ambient.score * 0.2))
  const score = Math.min(100, primary.score + bonus)
  const level: RiskAssessment['level'] =
    primary.level === 'blocked' ? 'blocked' : score >= CAUTION_THRESHOLD ? 'caution' : 'clean'

  const reasons = [...primary.reasons]
  if (bonus > 0) reasons.push('Scam-like language elsewhere on the same page')

  return { score, level, reasons }
}

/**
 * Advice shown alongside results. These are the rules that keep you out of
 * trouble regardless of how good the filtering is.
 */
export const SAFETY_RULES = [
  'A real panel never charges to join. Money flows to you — a registration, activation or starter-kit fee means the fee is the business.',
  'Panels pay by PayPal or gift code. None of them need your bank account, routing number or Social Security number to send you $5.',
  'Never accept a cheque and forward part of it onward. That is cheque fraud with you as the visible party, and the cheque bounces after you have sent real money.',
  'Cash out early and often. A balance sitting on a panel is not protected if the operator closes, and high thresholds exist because unredeemed balances are profit.',
  'Use a dedicated email address. The address itself is a product these platforms sell.',
  'Answer honestly and consistently. Panels run attention checks and compare your answers across surveys; contradicting yourself gets the account banned and the balance voided.',
  'Never automate survey answers. Timing analysis and attention checks catch it, and the penalty is a forfeited balance rather than a warning.',
  'If a survey asks for your full card number, SSN or passwords, close it. Legitimate research never needs those, whoever it claims to be from.',
]
