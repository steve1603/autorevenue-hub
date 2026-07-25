import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'

import { clearRobotsCache, fetchText, mapWithConcurrency, parseRobots } from '../fetcher.ts'
import {
  decodeEntities,
  detectBrands,
  extractOfferCandidates,
  extractValueUsd,
  htmlToText,
  looksLikeGiftCardOffer,
  parseRedditListing,
  truncate,
} from '../extract.ts'
import { assessOfferRisk, assessRisk, registrableDomain } from '../scam-filter.ts'
import { scoreOffer, scoreProgram } from '../score.ts'
import { scan } from '../scanner.ts'
import { SOURCES } from '../sources.ts'
import type { GiftCardSource, LivenessCheck } from '../types.ts'

describe('htmlToText', () => {
  it('drops scripts, styles and comments', () => {
    const html = `
      <html><head><style>.a{color:red}</style><script>alert('hi')</script></head>
      <body><!-- hidden --><h1>Free $10 gift card</h1><p>with purchase</p></body></html>`
    const text = htmlToText(html)
    assert.equal(text.includes('alert'), false)
    assert.equal(text.includes('color:red'), false)
    assert.equal(text.includes('hidden'), false)
    assert.match(text, /Free \$10 gift card with purchase/)
  })

  it('decodes named and numeric entities', () => {
    assert.equal(decodeEntities('Macy&#39;s &amp; Co&nbsp;&mdash; &#x24;25'), "Macy's & Co — $25")
  })

  it('leaves invalid entities alone', () => {
    assert.equal(decodeEntities('&notarealentity; &#x110000;'), '&notarealentity; &#x110000;')
  })
})

describe('offer detection', () => {
  it('accepts free-card language and rejects plain resale listings', () => {
    assert.equal(looksLikeGiftCardOffer('Free $25 Amazon gift card with purchase'), true)
    assert.equal(looksLikeGiftCardOffer('Earn a Target gift card for reviews'), true)
    assert.equal(looksLikeGiftCardOffer('Buy discounted gift cards here'), false)
    assert.equal(looksLikeGiftCardOffer('Half off espresso machines today'), false)
  })

  it('extracts anchors and resolves relative hrefs', () => {
    const html = `
      <div>
        <a href="/deal/1">Free $20 Target gift card when you spend $100</a>
        <a href="https://example.com/deal/2">Earn a Starbucks gift card for a survey</a>
        <a href="/deal/3">Cheap socks, three pack</a>
        <a href="javascript:void(0)">Free gift card with purchase today</a>
      </div>`
    const candidates = extractOfferCandidates(html, 'https://deals.example.com/gift-cards/')

    assert.equal(candidates.length, 2)
    assert.equal(candidates[0].url, 'https://deals.example.com/deal/1')
    assert.equal(candidates[1].url, 'https://example.com/deal/2')
  })

  it('does not emit the same title and link twice', () => {
    const html = `
      <a href="/x">Free $20 Target gift card when you spend $100</a>
      <a href="/x">Free $20 Target gift card when you spend $100</a>`
    assert.equal(extractOfferCandidates(html, 'https://deals.example.com/').length, 1)
  })

  it('reads a reddit listing and prefers the permalink', () => {
    const body = JSON.stringify({
      data: {
        children: [
          {
            data: {
              title: 'Free $5 Amazon gift card for new users',
              permalink: '/r/freebies/comments/abc/free_5/',
              url: 'https://sketchy.example/claim',
              selftext: 'No purchase needed.',
            },
          },
          { data: { title: 'Discussion thread', permalink: '/r/freebies/comments/def/' } },
        ],
      },
    })

    const candidates = parseRedditListing(body, 'https://www.reddit.com/r/freebies/')
    assert.equal(candidates.length, 1)
    assert.equal(candidates[0].url, 'https://www.reddit.com/r/freebies/comments/abc/free_5/')
    assert.match(candidates[0].context, /sketchy\.example/)
  })

  it('returns nothing for malformed json', () => {
    assert.deepEqual(parseRedditListing('{not json', 'https://www.reddit.com/'), [])
  })

  it('reads the smaller amount as the card value', () => {
    assert.equal(extractValueUsd('Spend $100, get a $20 gift card'), 20)
    assert.equal(extractValueUsd('Get a $1,000 gift card'), 1000)
    assert.equal(extractValueUsd('Free tote bag'), undefined)
  })

  it('finds brand names without matching substrings', () => {
    const brands = detectBrands('Free Amazon and Best Buy gift cards, plus Target credit')
    assert.deepEqual(brands.sort(), ['Amazon', 'Best Buy', 'Target'])
    assert.deepEqual(detectBrands('Targeted advertising'), [])
  })

  it('truncates on a word boundary', () => {
    assert.equal(truncate('a short one', 40), 'a short one')
    assert.equal(truncate('the quick brown fox jumps over', 20), 'the quick brown fox…')
  })
})

describe('scam filter', () => {
  it('blocks code generators', () => {
    const risk = assessRisk(
      'Free Amazon gift card generator 2026 — no human verification, 100% working',
      'https://amazon-freecards.xyz/gen',
    )
    assert.equal(risk.level, 'blocked')
    assert.ok(risk.reasons.some((reason) => /generator/i.test(reason)))
  })

  it('flags brand impersonation on an unaffiliated domain', () => {
    const risk = assessRisk('Amazon gift card offer', 'https://amazon-rewards-claim.top/')
    assert.ok(risk.score >= 25)
    assert.ok(risk.reasons.some((reason) => /unaffiliated domain/i.test(reason)))
  })

  it('leaves a real retailer promotion clean', () => {
    const risk = assessRisk(
      'Spend $50 on groceries and get a $10 Target gift card, this week only',
      'https://www.target.com/c/weekly-ad',
    )
    assert.equal(risk.level, 'clean')
  })

  it('does not flag a legitimate program page', () => {
    const risk = assessRisk(
      'Earn points for everyday searches and redeem them for gift cards',
      'https://rewards.bing.com/',
    )
    assert.equal(risk.level, 'clean')
  })

  it('flags data harvesting even without generator language', () => {
    const risk = assessRisk(
      'You have been selected! Claim your free $500 gift card — complete 20 deals to unlock',
      'https://rewards-portal.example.com/claim',
    )
    assert.equal(risk.level, 'blocked')
  })

  it('rejects non-web schemes', () => {
    assert.equal(assessRisk('gift card', 'ftp://example.com/x').level, 'blocked')
  })

  it('does not let a neighbouring scam listing block an honest offer', () => {
    const risk = assessOfferRisk({
      title: 'Spend $50 at Target, get a free $10 gift card',
      url: 'https://www.target.com/deal',
      context: 'Free Amazon gift card generator, no human verification, 100% working',
    })
    assert.notEqual(risk.level, 'blocked')
    assert.ok(risk.reasons.some((reason) => /elsewhere on the same page/i.test(reason)))
  })

  it('still blocks when the offer itself is the scam', () => {
    const risk = assessOfferRisk({
      title: 'Free Amazon gift card generator, no human verification',
      url: 'https://deals.example.com/x',
      context: 'Unrelated neighbouring copy about socks',
    })
    assert.equal(risk.level, 'blocked')
  })

  it('weights owned context fully', () => {
    const shared = {
      title: 'Free gift card offer for everyone',
      url: 'https://www.reddit.com/r/freebies/comments/x/',
      context: 'Use our gift card generator, no human verification needed',
    }
    assert.notEqual(assessOfferRisk(shared).level, 'blocked')
    assert.equal(assessOfferRisk({ ...shared, contextIsOwned: true }).level, 'blocked')
  })

  it('handles multi-part public suffixes', () => {
    assert.equal(registrableDomain('www.example.co.uk'), 'example.co.uk')
    assert.equal(registrableDomain('deals.example.com'), 'example.com')
    assert.equal(registrableDomain('example.com'), 'example.com')
  })
})

describe('robots.txt parsing', () => {
  it('applies the wildcard group and honours explicit allows', () => {
    const rules = parseRobots(`
      User-agent: BadBot
      Disallow: /

      User-agent: *
      Disallow: /private
      Allow: /private/public-deals
      Disallow: /search?*
    `)

    assert.deepEqual(rules.disallow, ['/private', '/search?'])
    assert.deepEqual(rules.allow, ['/private/public-deals'])
  })

  it('treats an empty disallow as permitting everything', () => {
    assert.deepEqual(parseRobots('User-agent: *\nDisallow:').disallow, [])
  })

  it('ignores comments and blank lines', () => {
    const rules = parseRobots('# comment\n\nUser-agent: *\nDisallow: /x # trailing\n')
    assert.deepEqual(rules.disallow, ['/x'])
  })
})

describe('fetcher against a local server', () => {
  let server: http.Server
  let base: string

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('User-agent: *\nDisallow: /private\nAllow: /private/ok\n')
        return
      }
      if (req.url === '/slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<p>too late</p>')
        }, 3000).unref()
        return
      }
      if (req.url === '/missing') {
        res.writeHead(404)
        res.end('nope')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<html><body><a href="/deal">Free $15 Amazon gift card, no purchase</a></body></html>')
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    clearRobotsCache()
  })

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })

  it('fetches an allowed page', async () => {
    const result = await fetchText(`${base}/deals`, { timeoutMs: 2000 })
    assert.equal(result.ok, true)
    assert.match(result.text ?? '', /Amazon gift card/)
  })

  it('refuses a path disallowed by robots.txt', async () => {
    const result = await fetchText(`${base}/private/secret`, { timeoutMs: 2000 })
    assert.equal(result.ok, false)
    assert.equal(result.error, 'Disallowed by robots.txt')
  })

  it('follows an Allow that overrides a Disallow', async () => {
    const result = await fetchText(`${base}/private/ok`, { timeoutMs: 2000 })
    assert.equal(result.ok, true)
  })

  it('reports HTTP errors instead of throwing', async () => {
    const result = await fetchText(`${base}/missing`, { timeoutMs: 2000 })
    assert.equal(result.ok, false)
    assert.equal(result.status, 404)
  })

  it('times out rather than hanging', async () => {
    const result = await fetchText(`${base}/slow`, { timeoutMs: 250 })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /Timed out/)
  })

  it('caps the response size', async () => {
    const result = await fetchText(`${base}/deals`, { timeoutMs: 2000, maxBytes: 20 })
    assert.equal(result.ok, true)
    assert.ok((result.text ?? '').length <= 20)
  })
})

describe('mapWithConcurrency', () => {
  it('keeps input order and never exceeds the limit', async () => {
    let inFlight = 0
    let peak = 0

    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (value) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      return value * 2
    })

    assert.deepEqual(results, [2, 4, 6, 8, 10, 12, 14])
    assert.ok(peak <= 3, `peak concurrency was ${peak}`)
  })

  it('handles an empty list', async () => {
    assert.deepEqual(await mapWithConcurrency([], 4, async (v) => v), [])
  })
})

describe('scoring', () => {
  const live: LivenessCheck = { ok: true, status: 200, checkedAt: new Date().toISOString() }
  const clean = { score: 0, level: 'clean' as const, reasons: [] }

  const base: GiftCardSource = {
    id: 'x',
    name: 'x',
    kind: 'program',
    category: 'rewards-program',
    url: 'https://example.com/',
    brands: [],
    regions: ['US'],
    effort: 'passive',
    monthlyValueUsd: [10, 20],
    requiresPurchase: false,
    notes: '',
  }

  it('prefers passive, no-purchase programs over equal-value grinds', () => {
    const passive = scoreProgram(base, live, clean)
    const grind = scoreProgram({ ...base, effort: 'high', requiresPurchase: true }, live, clean)
    assert.ok(passive > grind, `${passive} should beat ${grind}`)
  })

  it('penalises an unverified source', () => {
    const unverified = scoreProgram(base, { ok: false, checkedAt: live.checkedAt }, clean)
    assert.ok(unverified < scoreProgram(base, live, clean))
  })

  it('penalises risky sources', () => {
    const risky = scoreProgram(base, live, { score: 40, level: 'caution', reasons: ['x'] })
    assert.ok(risky < scoreProgram(base, live, clean))
  })

  it('keeps scores inside 0-100', () => {
    const huge = scoreProgram({ ...base, monthlyValueUsd: [10000, 20000] }, live, clean)
    const awful = scoreProgram(
      { ...base, effort: 'high', requiresPurchase: true, monthlyValueUsd: [0, 0] },
      { ok: false, checkedAt: live.checkedAt },
      { score: 100, level: 'blocked', reasons: [] },
    )
    assert.ok(huge <= 100 && awful >= 0)
  })

  it('rewards higher-value offers and punishes risk', () => {
    const good = scoreOffer({ valueUsd: 50, brands: ['Amazon'], risk: clean, sourceEffort: 'low' })
    const risky = scoreOffer({
      valueUsd: 50,
      brands: ['Amazon'],
      risk: { score: 50, level: 'caution', reasons: [] },
      sourceEffort: 'low',
    })
    assert.ok(good > risky)
  })
})

describe('source catalog', () => {
  it('has unique ids and well-formed https urls', () => {
    const ids = new Set<string>()
    for (const source of SOURCES) {
      assert.equal(ids.has(source.id), false, `duplicate id: ${source.id}`)
      ids.add(source.id)
      assert.doesNotThrow(() => new URL(source.url), `bad url on ${source.id}`)
      assert.ok(source.url.startsWith('https://'), `${source.id} must use https`)
      assert.ok(source.notes.length > 40, `${source.id} needs a real explanation of the catch`)
      assert.ok(source.regions.length > 0, `${source.id} needs at least one region`)
    }
  })

  it('never advertises anything the scam filter would block', () => {
    for (const source of SOURCES) {
      const risk = assessRisk(`${source.name} ${source.notes}`, source.url)
      assert.notEqual(risk.level, 'blocked', `${source.id} tripped: ${risk.reasons.join('; ')}`)
    }
  })

  it('gives every feed source somewhere to crawl', () => {
    for (const source of SOURCES.filter((s) => s.kind === 'feed')) {
      assert.ok((source.discoveryUrls ?? []).length > 0, `${source.id} has no discovery urls`)
    }
  })
})

describe('scan in offline mode', () => {
  it('returns the catalog without touching the network', async () => {
    const result = await scan({ offline: true })
    assert.ok(result.programs.length > 0)
    assert.equal(result.offers.length, 0)
    assert.equal(result.unreachable.length, 0)
    assert.ok(result.warnings.some((w) => /Offline mode/.test(w)))
    for (const program of result.programs) {
      assert.equal(program.liveness.ok, false)
      assert.match(program.liveness.error ?? '', /offline/i)
    }
  })

  it('sorts programs by descending score', async () => {
    const { programs } = await scan({ offline: true })
    const scores = programs.map((p) => p.score)
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
  })

  it('applies the region filter', async () => {
    const { programs } = await scan({ offline: true, region: 'GB' })
    assert.ok(programs.length > 0)
    for (const program of programs) {
      assert.ok(program.source.regions.some((r) => r === 'WW' || r === 'GB'), program.source.id)
    }
  })

  it('applies the effort ceiling', async () => {
    const { programs } = await scan({ offline: true, maxEffort: 'low' })
    assert.ok(programs.length > 0)
    for (const program of programs) {
      assert.ok(['passive', 'low'].includes(program.source.effort), program.source.id)
    }
  })

  it('applies the no-purchase filter', async () => {
    const { programs } = await scan({ offline: true, noPurchaseOnly: true })
    assert.ok(programs.length > 0)
    for (const program of programs) {
      assert.equal(program.source.requiresPurchase, false, program.source.id)
    }
  })

  it('reports stats consistent with the results', async () => {
    const result = await scan({ offline: true })
    assert.equal(result.stats.offersFound, result.offers.length)
    assert.equal(result.stats.sourcesUnreachable, result.unreachable.length)
    assert.ok(result.stats.sourcesConsidered >= result.programs.length)
    assert.ok(result.stats.durationMs >= 0)
  })
})

describe('end-to-end crawl against a local feed', () => {
  let server: http.Server
  let base: string

  const feedSource = (url: string): GiftCardSource => ({
    id: 'local-feed',
    name: 'Local test feed',
    kind: 'feed',
    category: 'deal-feed',
    url,
    discoveryUrls: [`${url}/gift-cards`],
    brands: [],
    regions: ['US'],
    effort: 'low',
    monthlyValueUsd: [0, 20],
    requiresPurchase: false,
    notes: 'Fixture feed used by the test suite to exercise the full crawl path.',
  })

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('User-agent: *\nDisallow:\n')
        return
      }
      if (req.url === '/gift-cards') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html><body>
            <a href="/deals/target">Spend $50 at Target, get a free $10 gift card</a>
            <a href="https://amazon-cards-free.xyz/gen">Free Amazon gift card generator, no human verification</a>
            <a href="/deals/socks">Discount socks, buy two pairs</a>
          </body></html>`)
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<html><body>Local test program page, earn rewards.</body></html>')
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    clearRobotsCache()
  })

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })

  it('surfaces the real promotion and blocks the generator', async () => {
    const result = await scan({ sources: [feedSource(base)], timeoutMs: 3000 })

    assert.equal(result.offers.length, 1, JSON.stringify(result.offers, null, 2))
    const [offer] = result.offers
    assert.match(offer.title, /Target/)
    assert.equal(offer.valueUsd, 10)
    assert.deepEqual(offer.brands, ['Target'])
    assert.equal(offer.url, `${base}/deals/target`)
    assert.equal(offer.sourceName, 'Local test feed')

    assert.equal(result.blocked.length, 1)
    assert.match(result.blocked[0].title, /generator/i)
    assert.equal(result.stats.offersBlocked, 1)
    assert.equal(result.stats.sourcesUnreachable, 0)
  })

  it('records an unreachable discovery url without failing the scan', async () => {
    const broken = { ...feedSource(base), discoveryUrls: [`${base}/gift-cards`, 'https://127.0.0.1:1/x'] }
    const result = await scan({ sources: [broken], timeoutMs: 1500 })

    assert.equal(result.offers.length, 1)
    assert.equal(result.unreachable.length, 1)
    assert.equal(result.unreachable[0].id, 'local-feed')
  })

  it('respects the offer limit', async () => {
    const result = await scan({ sources: [feedSource(base)], timeoutMs: 3000, limit: 0 })
    assert.equal(result.offers.length, 0)
  })
})
