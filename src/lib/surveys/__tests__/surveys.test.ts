import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'

import { clearRobotsCache, fetchText, mapWithConcurrency, parseRobots } from '../fetcher.ts'
import {
  decodeEntities,
  detectBrands,
  extractMinutes,
  extractOfferCandidates,
  extractValueUsd,
  htmlToText,
  looksLikeEarningOpportunity,
  parseRedditListing,
  truncate,
} from '../extract.ts'
import { assessOfferRisk, assessRisk, registrableDomain } from '../scam-filter.ts'
import {
  computeEconomics,
  effectiveMinutesPerSurvey,
  planForTarget,
  scorePanel,
  usdPerSurvey,
} from '../earnings.ts'
import { scan } from '../scanner.ts'
import { PANELS, isDiscoveryFeed } from '../panels.ts'
import type { LivenessCheck, SurveyPanel } from '../types.ts'

const CLEAN_RISK = { score: 0, level: 'clean' as const, reasons: [] }
const LIVE: LivenessCheck = { ok: true, status: 200, checkedAt: new Date().toISOString() }

/** A plain router: $1 per 15-minute survey, screened out half the time. */
function basePanel(overrides: Partial<SurveyPanel> = {}): SurveyPanel {
  return {
    id: 'test',
    name: 'Test Panel',
    kind: 'survey-panel',
    url: 'https://example.com/',
    payoutUnit: 'points',
    unitsPerDollar: 100,
    typicalUnitsPerSurvey: 100,
    typicalMinutes: 15,
    screenOutRate: 0.5,
    screenerMinutes: 5,
    typicalSurveysPerWeek: 10,
    minCashoutUsd: 5,
    payoutSpeed: 'days',
    giftCards: ['Amazon'],
    regions: ['US'],
    inviteOnly: false,
    mobileOnly: false,
    notes: 'A fixture panel used by the test suite to check the earnings arithmetic.',
    ...overrides,
  }
}

describe('earnings arithmetic', () => {
  it('converts platform units to dollars', () => {
    assert.equal(usdPerSurvey(basePanel()), 1)
    assert.equal(usdPerSurvey(basePanel({ unitsPerDollar: 1, typicalUnitsPerSurvey: 2.5 })), 2.5)
    assert.equal(usdPerSurvey(basePanel({ unitsPerDollar: 0 })), 0)
  })

  it('charges screen-out time to the surveys that do complete', () => {
    // At 50% you expect one wasted screener per completion: 15 + 1x5 = 20.
    assert.equal(effectiveMinutesPerSurvey(basePanel()), 20)
    // At 0% there is nothing wasted.
    assert.equal(effectiveMinutesPerSurvey(basePanel({ screenOutRate: 0 })), 15)
    // At 80% you expect four: 15 + 4x5 = 35.
    assert.equal(effectiveMinutesPerSurvey(basePanel({ screenOutRate: 0.8 })), 35)
  })

  it('treats a total screen-out rate as never completing', () => {
    assert.equal(effectiveMinutesPerSurvey(basePanel({ screenOutRate: 1 })), Infinity)
    const economics = computeEconomics(basePanel({ screenOutRate: 1 }))
    assert.equal(economics.effectiveHourlyUsd, 0)
  })

  it('reports the real hourly rate below the advertised one', () => {
    const economics = computeEconomics(basePanel())
    assert.equal(economics.nominalHourlyUsd, 4) // $1 per 15 min
    assert.equal(economics.effectiveHourlyUsd, 3) // $1 per 20 min once screened out
    assert.ok(economics.effectiveHourlyUsd < economics.nominalHourlyUsd)
  })

  it('prices weekly earnings from actual survey supply', () => {
    assert.equal(computeEconomics(basePanel()).realisticWeeklyUsd, 10)
    assert.equal(computeEconomics(basePanel({ typicalSurveysPerWeek: 2 })).realisticWeeklyUsd, 2)
  })

  it('counts surveys and hours to the cash-out threshold', () => {
    const economics = computeEconomics(basePanel())
    assert.equal(economics.surveysToMinCashout, 5) // $5 at $1 each
    assert.equal(economics.hoursToMinCashout, 1.7) // 5 x 20 min
  })
})

describe('target planning', () => {
  it('works out surveys, hours and calendar weeks', () => {
    const plan = planForTarget(basePanel(), 25)
    assert.equal(plan.reachable, true)
    assert.equal(plan.surveysNeeded, 25)
    assert.equal(plan.hoursNeeded, 8.3) // 25 x 20 min
    assert.equal(plan.weeksNeeded, 2.5) // 25 surveys at 10/week
  })

  it('refuses a target below the cash-out minimum', () => {
    const plan = planForTarget(basePanel({ minCashoutUsd: 15 }), 5)
    assert.equal(plan.reachable, false)
    assert.match(plan.blockedReason ?? '', /cannot cash out below \$15/i)
    // It still reports what the minimum would take, rather than just refusing.
    assert.equal(plan.surveysNeeded, 15)
  })

  it('marks discovery feeds as not earnable', () => {
    const plan = planForTarget(basePanel({ typicalUnitsPerSurvey: 0 }), 25)
    assert.equal(plan.reachable, false)
    assert.match(plan.blockedReason ?? '', /discovery feed/i)
  })

  it('never returns a finite plan for a panel with no supply', () => {
    const plan = planForTarget(basePanel({ typicalSurveysPerWeek: 0 }), 25)
    assert.equal(plan.weeksNeeded, Infinity)
  })
})

describe('panel scoring', () => {
  it('prefers a better hourly rate, all else equal', () => {
    const good = scorePanel(
      basePanel({ typicalUnitsPerSurvey: 400 }),
      computeEconomics(basePanel({ typicalUnitsPerSurvey: 400 })),
      LIVE,
      CLEAN_RISK,
    )
    const poor = scorePanel(basePanel(), computeEconomics(basePanel()), LIVE, CLEAN_RISK)
    assert.ok(good > poor, `${good} should beat ${poor}`)
  })

  it('does not let a high rate on negligible volume win', () => {
    // $30/hr but only one survey a week.
    const scarce = basePanel({ typicalUnitsPerSurvey: 750, typicalSurveysPerWeek: 1 })
    // $3/hr with plenty of work.
    const plentiful = basePanel({ typicalSurveysPerWeek: 25 })

    const scarceScore = scorePanel(scarce, computeEconomics(scarce), LIVE, CLEAN_RISK)
    const plentifulScore = scorePanel(plentiful, computeEconomics(plentiful), LIVE, CLEAN_RISK)

    assert.ok(
      Math.abs(scarceScore - plentifulScore) < 20,
      `scarce ${scarceScore} and plentiful ${plentifulScore} should be comparable`,
    )
  })

  it('penalises high thresholds, slow payouts and invite walls', () => {
    const baseline = scorePanel(basePanel(), computeEconomics(basePanel()), LIVE, CLEAN_RISK)

    for (const worse of [
      basePanel({ minCashoutUsd: 25 }),
      basePanel({ payoutSpeed: 'weeks' }),
      basePanel({ inviteOnly: true }),
    ]) {
      assert.ok(
        scorePanel(worse, computeEconomics(worse), LIVE, CLEAN_RISK) < baseline,
        JSON.stringify(worse.id),
      )
    }
  })

  it('penalises risk and keeps the score in range', () => {
    const risky = scorePanel(basePanel(), computeEconomics(basePanel()), LIVE, {
      score: 70,
      level: 'blocked',
      reasons: ['x'],
    })
    assert.ok(risky >= 0 && risky <= 100)
    assert.ok(risky < scorePanel(basePanel(), computeEconomics(basePanel()), LIVE, CLEAN_RISK))
  })
})

describe('extraction', () => {
  it('drops scripts, styles and comments', () => {
    const text = htmlToText(
      `<style>.a{color:red}</style><script>alert('x')</script><!--h--><p>Paid study, $75</p>`,
    )
    assert.equal(text, 'Paid study, $75')
  })

  it('decodes entities and leaves invalid ones alone', () => {
    assert.equal(decodeEntities('Macy&#39;s &amp; Co&nbsp;&mdash; &#x24;25'), "Macy's & Co — $25")
    assert.equal(decodeEntities('&notreal; &#x110000;'), '&notreal; &#x110000;')
  })

  it('recognises paid research and rejects unrelated copy', () => {
    assert.equal(looksLikeEarningOpportunity('Paid research study, $75 for 60 minutes'), true)
    assert.equal(looksLikeEarningOpportunity('Earn gift cards taking surveys'), true)
    assert.equal(looksLikeEarningOpportunity('Take our customer satisfaction survey'), false)
    assert.equal(looksLikeEarningOpportunity('Half off espresso machines'), false)
  })

  it('reads durations in minutes and hours', () => {
    assert.equal(extractMinutes('20 minute interview'), 20)
    assert.equal(extractMinutes('45-min study'), 45)
    assert.equal(extractMinutes('1 hour session'), 60)
    assert.equal(extractMinutes('1.5 hours'), 90)
    assert.equal(extractMinutes('no duration here'), undefined)
    assert.equal(extractMinutes('900 minutes'), undefined) // implausible, rejected
  })

  it('takes the conservative figure from a payout range', () => {
    assert.equal(extractValueUsd('$40-$75 for a 1 hour study'), 40)
    assert.equal(extractValueUsd('Earn a $1,000 gift card'), 1000)
    assert.equal(extractValueUsd('No money mentioned'), undefined)
  })

  it('extracts anchors and resolves relative hrefs', () => {
    const html = `
      <a href="/s/1">Paid study: $75 for a 60 minute interview</a>
      <a href="https://example.org/s/2">Earn $40 for a research session</a>
      <a href="/s/3">Cheap socks, three pack</a>
      <a href="javascript:void(0)">Paid survey, $10</a>`
    const found = extractOfferCandidates(html, 'https://studies.example.com/list/')

    assert.equal(found.length, 2)
    assert.equal(found[0].url, 'https://studies.example.com/s/1')
    assert.equal(found[1].url, 'https://example.org/s/2')
  })

  it('reads a reddit listing and prefers the permalink', () => {
    const body = JSON.stringify({
      data: {
        children: [
          {
            data: {
              title: 'Paid study, $50 for 30 minutes',
              permalink: '/r/beermoney/comments/abc/study/',
              url: 'https://sketchy.example/claim',
              selftext: 'Screener takes two minutes.',
            },
          },
          { data: { title: 'Weekly discussion thread' } },
        ],
      },
    })

    const found = parseRedditListing(body, 'https://www.reddit.com/r/beermoney/')
    assert.equal(found.length, 1)
    assert.equal(found[0].url, 'https://www.reddit.com/r/beermoney/comments/abc/study/')
    assert.equal(found[0].contextIsOwned, true)
  })

  it('returns nothing for malformed json', () => {
    assert.deepEqual(parseRedditListing('{not json', 'https://www.reddit.com/'), [])
  })

  it('finds brands without matching substrings', () => {
    assert.deepEqual(detectBrands('Pays in Amazon or Target cards').sort(), ['Amazon', 'Target'])
    assert.deepEqual(detectBrands('Targeted advertising'), [])
  })

  it('truncates on a word boundary', () => {
    assert.equal(truncate('the quick brown fox jumps over', 20), 'the quick brown fox…')
  })
})

describe('scam filter', () => {
  it('blocks platforms that charge you to join', () => {
    const risk = assessRisk(
      'Join our elite survey panel — one-time $39 registration fee unlocks $500/day surveys',
      'https://survey-riches.xyz/join',
    )
    assert.equal(risk.level, 'blocked')
    assert.ok(risk.reasons.some((reason) => /fee/i.test(reason)))
  })

  it('blocks the cheque-cashing mystery shopper scam', () => {
    const risk = assessRisk(
      'We will mail you a cashiers check — evaluate a money transfer service and keep $300',
      'https://example.com/shopper',
    )
    assert.equal(risk.level, 'blocked')
  })

  it('flags requests for bank details', () => {
    const risk = assessRisk('Enter your bank account number to receive survey payments')
    assert.ok(risk.score >= 25)
  })

  it('leaves a real panel description clean', () => {
    const risk = assessRisk(
      'Take paid surveys and redeem points for Amazon gift cards',
      'https://www.swagbucks.com/',
    )
    assert.equal(risk.level, 'clean')
  })

  it('leaves a legitimate high-paying study clean', () => {
    const risk = assessRisk(
      'Paid research study: $150 for a 90 minute remote interview with product designers',
      'https://www.respondent.io/projects/123',
    )
    assert.equal(risk.level, 'clean')
  })

  it('flags brand impersonation on an unaffiliated domain', () => {
    const risk = assessRisk('Amazon rewards survey', 'https://amazon-rewards-claim.top/')
    assert.ok(risk.reasons.some((reason) => /unaffiliated domain/i.test(reason)))
  })

  it('handles multi-part public suffixes', () => {
    assert.equal(registrableDomain('www.example.co.uk'), 'example.co.uk')
    assert.equal(registrableDomain('deals.example.com'), 'example.com')
  })

  it('does not let a neighbouring scam listing block an honest one', () => {
    const risk = assessOfferRisk({
      title: 'Paid study: $75 for a 60 minute interview',
      url: 'https://www.userinterviews.com/projects/1',
      context: 'Make $900/day with our survey system — $39 registration fee',
    })
    assert.notEqual(risk.level, 'blocked')
    assert.ok(risk.reasons.some((reason) => /elsewhere on the same page/i.test(reason)))
  })

  it('weights owned context fully', () => {
    const shared = {
      title: 'Great new earning opportunity for survey takers',
      url: 'https://www.reddit.com/r/beermoney/comments/x/',
      context: 'You just pay the $25 activation fee and start earning',
    }
    assert.notEqual(assessOfferRisk(shared).level, 'blocked')
    assert.equal(assessOfferRisk({ ...shared, contextIsOwned: true }).level, 'blocked')
  })
})

describe('robots.txt parsing', () => {
  it('applies the wildcard group and honours explicit allows', () => {
    const rules = parseRobots(`
      User-agent: BadBot
      Disallow: /

      User-agent: *
      Disallow: /private
      Allow: /private/public
    `)
    assert.deepEqual(rules.disallow, ['/private'])
    assert.deepEqual(rules.allow, ['/private/public'])
  })

  it('keeps wildcard patterns verbatim rather than truncating them', () => {
    // Truncating at the `*` collapsed these to "/" and blocked whole domains.
    const rules = parseRobots('User-agent: *\nDisallow: /*?\nDisallow: /*.json$\n')
    assert.deepEqual(rules.disallow, ['/*?', '/*.json$'])
  })

  it('treats an empty disallow as permitting everything', () => {
    assert.deepEqual(parseRobots('User-agent: *\nDisallow:').disallow, [])
  })
})

describe('fetcher against a local server', () => {
  let server: http.Server
  let base: string

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        // Wildcard rules mirroring what real sites ship. They must not be read
        // as a blanket ban on the whole origin.
        res.end(
          'User-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*?\nDisallow: /*.json$\n',
        )
        return
      }
      if (req.url === '/slow') {
        setTimeout(() => {
          res.writeHead(200)
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
      res.end('<html><body><a href="/s/1">Paid study, $50 for 30 minutes</a></body></html>')
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
    const result = await fetchText(`${base}/studies`, { timeoutMs: 2000 })
    assert.equal(result.ok, true)
    assert.match(result.text ?? '', /Paid study/)
  })

  it('still allows ordinary paths when wildcard rules are present', async () => {
    const result = await fetchText(`${base}/studies`, { timeoutMs: 2000 })
    assert.equal(result.ok, true, 'a "Disallow: /*?" rule must not ban the whole origin')
  })

  it('honours a wildcard rule for the paths it covers', async () => {
    const withQuery = await fetchText(`${base}/studies?page=2`, { timeoutMs: 2000 })
    assert.equal(withQuery.error, 'Disallowed by robots.txt')

    const anchored = await fetchText(`${base}/data.json`, { timeoutMs: 2000 })
    assert.equal(anchored.error, 'Disallowed by robots.txt')
  })

  it('refuses a disallowed path but honours an Allow override', async () => {
    assert.equal((await fetchText(`${base}/private/secret`, { timeoutMs: 2000 })).ok, false)
    assert.equal((await fetchText(`${base}/private/ok`, { timeoutMs: 2000 })).ok, true)
  })

  it('reports HTTP errors and timeouts instead of throwing', async () => {
    assert.equal((await fetchText(`${base}/missing`, { timeoutMs: 2000 })).status, 404)
    const slow = await fetchText(`${base}/slow`, { timeoutMs: 250 })
    assert.match(slow.error ?? '', /Timed out/)
  })

  it('caps the response size', async () => {
    const result = await fetchText(`${base}/studies`, { timeoutMs: 2000, maxBytes: 20 })
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

describe('panel catalog', () => {
  it('has unique ids and https urls', () => {
    const ids = new Set<string>()
    for (const panel of PANELS) {
      assert.equal(ids.has(panel.id), false, `duplicate id: ${panel.id}`)
      ids.add(panel.id)
      assert.ok(panel.url.startsWith('https://'), `${panel.id} must use https`)
      assert.doesNotThrow(() => new URL(panel.url), `bad url on ${panel.id}`)
      assert.ok(panel.notes.length > 40, `${panel.id} needs a real explanation of the catch`)
      assert.ok(panel.regions.length > 0, `${panel.id} needs a region`)
    }
  })

  it('holds internally consistent economics', () => {
    for (const panel of PANELS) {
      assert.ok(panel.unitsPerDollar > 0, `${panel.id} needs a conversion rate`)
      assert.ok(panel.screenOutRate >= 0 && panel.screenOutRate < 1, `${panel.id} screen-out rate`)
      assert.ok(panel.typicalSurveysPerWeek >= 0, `${panel.id} weekly volume`)
      assert.ok(panel.minCashoutUsd >= 0, `${panel.id} threshold`)

      if (isDiscoveryFeed(panel)) continue

      const economics = computeEconomics(panel)
      assert.ok(economics.effectiveHourlyUsd > 0, `${panel.id} earns nothing`)
      assert.ok(
        economics.effectiveHourlyUsd <= economics.nominalHourlyUsd,
        `${panel.id}: real rate must not exceed the advertised one`,
      )
      // A plausibility bound, to catch a mistyped conversion rate.
      assert.ok(economics.effectiveHourlyUsd < 200, `${panel.id} rate looks mistyped`)
    }
  })

  it('never advertises anything the scam filter would block', () => {
    for (const panel of PANELS) {
      const risk = assessRisk(`${panel.name} ${panel.notes}`, panel.url)
      assert.notEqual(risk.level, 'blocked', `${panel.id} tripped: ${risk.reasons.join('; ')}`)
    }
  })

  it('gives every discovery feed somewhere to crawl', () => {
    for (const panel of PANELS.filter(isDiscoveryFeed)) {
      assert.ok((panel.discoveryUrls ?? []).length > 0, `${panel.id} has no discovery urls`)
    }
  })
})

describe('scan in offline mode', () => {
  it('ranks the catalog without touching the network', async () => {
    const result = await scan({ offline: true })
    assert.ok(result.panels.length > 0)
    assert.equal(result.opportunities.length, 0)
    assert.equal(result.failed.length, 0)
    assert.ok(result.warnings.some((warning) => /Offline mode/.test(warning)))
  })

  it('excludes discovery feeds from the earning rankings', async () => {
    const { panels } = await scan({ offline: true })
    assert.equal(panels.some((entry) => isDiscoveryFeed(entry.panel)), false)
  })

  it('sorts by descending score', async () => {
    const { panels } = await scan({ offline: true })
    const scores = panels.map((entry) => entry.score)
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
  })

  it('applies the region filter', async () => {
    const { panels } = await scan({ offline: true, region: 'GB' })
    assert.ok(panels.length > 0)
    for (const entry of panels) {
      assert.ok(entry.panel.regions.some((r) => r === 'WW' || r === 'GB'), entry.panel.id)
    }
  })

  it('applies the minimum hourly filter', async () => {
    const { panels } = await scan({ offline: true, minHourlyUsd: 5 })
    assert.ok(panels.length > 0)
    for (const entry of panels) {
      assert.ok(entry.economics.effectiveHourlyUsd >= 5, entry.panel.id)
    }
  })

  it('applies the invite-only and kind filters', async () => {
    const noInvite = await scan({ offline: true, excludeInviteOnly: true })
    assert.equal(noInvite.panels.some((entry) => entry.panel.inviteOnly), false)

    const studies = await scan({ offline: true, kind: 'research-study' })
    assert.ok(studies.panels.length > 0)
    for (const entry of studies.panels) {
      assert.equal(entry.panel.kind, 'research-study')
    }
  })

  it('applies the brand filter', async () => {
    const { panels } = await scan({ offline: true, brand: 'amazon' })
    assert.ok(panels.length > 0)
    for (const entry of panels) {
      assert.ok(
        entry.panel.giftCards.some((card) => card.toLowerCase().includes('amazon')),
        entry.panel.id,
      )
    }
  })

  it('plans against the requested target', async () => {
    const { panels } = await scan({ offline: true, targetUsd: 50 })
    for (const entry of panels) {
      assert.equal(entry.plan?.targetUsd, 50)
    }
  })
})

describe('end-to-end crawl against a local feed', () => {
  let server: http.Server
  let base: string

  const feed = (url: string): SurveyPanel =>
    basePanel({
      id: 'local-feed',
      name: 'Local test feed',
      url,
      discoveryUrls: [`${url}/studies`],
      typicalUnitsPerSurvey: 0,
      notes: 'Fixture feed used by the test suite to exercise the full crawl path.',
    })

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('User-agent: *\nDisallow:\n')
        return
      }
      if (req.url === '/studies') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html><body>
            <a href="/s/real">Paid study: $75 for a 45 minute remote interview</a>
            <a href="https://survey-cash.xyz/join">Earn $900/day taking surveys — $39 registration fee</a>
            <a href="/s/socks">Discount socks, buy two pairs</a>
          </body></html>`)
        return
      }
      res.writeHead(200)
      res.end('ok')
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

  it('surfaces the real study and blocks the fee scam', async () => {
    const result = await scan({ panels: [feed(base)], timeoutMs: 3000 })

    assert.equal(result.opportunities.length, 1, JSON.stringify(result.opportunities, null, 2))
    const [found] = result.opportunities
    assert.match(found.title, /45 minute remote interview/)
    assert.equal(found.payoutUsd, 75)
    assert.equal(found.minutes, 45)
    assert.equal(found.url, `${base}/s/real`)

    assert.equal(result.blocked.length, 1)
    assert.match(result.blocked[0].title, /registration fee/i)
    assert.equal(result.stats.opportunitiesBlocked, 1)
  })

  it('records a failed discovery url without failing the scan', async () => {
    const broken = { ...feed(base), discoveryUrls: [`${base}/studies`, 'https://127.0.0.1:1/x'] }
    const result = await scan({ panels: [broken], timeoutMs: 1500 })

    assert.equal(result.opportunities.length, 1)
    assert.equal(result.failed.length, 1)
    assert.equal(result.robotsBlocked.length, 0)
  })

  it('respects the opportunity limit', async () => {
    const result = await scan({ panels: [feed(base)], timeoutMs: 3000, limit: 0 })
    assert.equal(result.opportunities.length, 0)
  })
})
