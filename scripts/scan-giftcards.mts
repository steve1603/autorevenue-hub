#!/usr/bin/env node
/**
 * Command-line runner for the gift card scanner.
 *
 *   npm run giftcards                       # full sweep
 *   npm run giftcards -- --region US --max-effort low --no-purchase
 *   npm run giftcards -- --json > report.json
 *
 * Runs on Node's built-in TypeScript stripping (Node 22.18+), so there is no
 * build step and no extra dependency.
 */
import { scan } from '../src/lib/giftcards/scanner.ts'
import { SAFETY_RULES } from '../src/lib/giftcards/scam-filter.ts'
import type { EffortLevel, ScanOptions } from '../src/lib/giftcards/types.ts'

const EFFORT_LEVELS: EffortLevel[] = ['passive', 'low', 'medium', 'high']

const USAGE = `
Scours curated reward programs and deal feeds for legitimate ways to get free gift cards.

Usage: npm run giftcards -- [options]

  --region <CC>       Only sources operating in this country, e.g. US, GB, CA
  --max-effort <lvl>  passive | low | medium | high  (default: all)
  --no-purchase       Exclude anything that requires spending money first
  --programs-only     Skip the deal feeds, check standing programs only
  --offline           No network access; print the curated catalog unverified
  --limit <n>         Maximum offers to list (default 40)
  --timeout <ms>      Per-request timeout (default 8000)
  --json              Emit raw JSON instead of a readable report
  --help              Show this message

Set BRAVE_SEARCH_API_KEY to widen the sweep beyond the curated sources.
`.trim()

interface ParsedArgs {
  options: ScanOptions
  json: boolean
  help: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const options: ScanOptions = {}
  let json = false
  let help = false

  const next = (index: number, flag: string): string => {
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`)
    }
    return value
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--help':
      case '-h':
        help = true
        break
      case '--json':
        json = true
        break
      case '--no-purchase':
        options.noPurchaseOnly = true
        break
      case '--programs-only':
        options.programsOnly = true
        break
      case '--offline':
        options.offline = true
        break
      case '--region':
        options.region = next(i, arg).toUpperCase()
        i++
        break
      case '--max-effort': {
        const value = next(i, arg).toLowerCase()
        if (!EFFORT_LEVELS.includes(value as EffortLevel)) {
          throw new Error(`--max-effort must be one of: ${EFFORT_LEVELS.join(', ')}`)
        }
        options.maxEffort = value as EffortLevel
        i++
        break
      }
      case '--limit':
        options.limit = requirePositiveInt(next(i, arg), '--limit')
        i++
        break
      case '--timeout':
        options.timeoutMs = requirePositiveInt(next(i, arg), '--timeout')
        i++
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  return { options, json, help }
}

function requirePositiveInt(raw: string, flag: string): number {
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} must be a positive integer`)
  return value
}

function money(range: [number, number]): string {
  const [low, high] = range
  if (low === 0 && high === 0) return 'varies'
  return low === high ? `$${low}/mo` : `$${low}-${high}/mo`
}

async function main(): Promise<void> {
  let parsed: ParsedArgs
  try {
    parsed = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error(`\n${USAGE}`)
    process.exitCode = 1
    return
  }

  if (parsed.help) {
    console.log(USAGE)
    return
  }

  const result = await scan(parsed.options)

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const { stats } = result
  console.log('\n=== Gift card sweep ===')
  console.log(
    `${new Date(result.scannedAt).toLocaleString()} · ${stats.sourcesConsidered} sources · ` +
      `${stats.sourcesFetched} reachable · ${stats.offersFound} offers · ` +
      `${stats.offersBlocked} scam candidates filtered · ${(stats.durationMs / 1000).toFixed(1)}s`,
  )

  console.log('\n--- Standing programs (ranked by value for the effort) ---')
  for (const program of result.programs) {
    const { source } = program
    const flags = [
      source.effort,
      money(source.monthlyValueUsd),
      source.requiresPurchase ? 'purchase required' : 'no purchase',
      program.liveness.ok ? 'live' : `unverified: ${program.liveness.error ?? 'unknown'}`,
    ].join(' · ')

    console.log(`\n[${String(program.score).padStart(3)}] ${source.name}`)
    console.log(`      ${flags}`)
    console.log(`      ${source.url}`)
    console.log(`      ${source.notes}`)
    if (program.risk.level !== 'clean') {
      console.log(`      RISK (${program.risk.level}): ${program.risk.reasons.join('; ')}`)
    }
  }

  if (result.offers.length > 0) {
    console.log('\n--- Current offers found in feeds ---')
    for (const offer of result.offers) {
      const value = offer.valueUsd !== undefined ? ` · $${offer.valueUsd}` : ''
      console.log(`\n[${String(offer.score).padStart(3)}] ${offer.title}${value}`)
      console.log(`      ${offer.sourceName} · ${offer.url}`)
      if (offer.risk.level !== 'clean') {
        console.log(`      CAUTION: ${offer.risk.reasons.join('; ')}`)
      }
    }
  } else if (!parsed.options.programsOnly && !parsed.options.offline) {
    console.log('\n--- No current feed offers matched. Feeds change hourly; try again later. ---')
  }

  if (result.blocked.length > 0) {
    console.log(`\n--- Filtered out as likely scams (${result.blocked.length}) ---`)
    for (const entry of result.blocked.slice(0, 10)) {
      console.log(`  · ${entry.title}`)
      console.log(`    ${entry.reasons.join('; ')}`)
    }
  }

  if (result.unreachable.length > 0) {
    // A site that bans crawlers is not a site that is down, and conflating the
    // two makes the catalog look broken when it is not.
    const robotsBlocked = result.unreachable.filter((entry) => /robots\.txt/i.test(entry.error))
    const failed = result.unreachable.filter((entry) => !/robots\.txt/i.test(entry.error))

    if (robotsBlocked.length > 0) {
      console.log('\n--- Not checked: these sites ask crawlers to stay out ---')
      console.log('    (the programs are fine, this tool just does not read their pages)')
      for (const entry of robotsBlocked) console.log(`  · ${entry.name}`)
    }

    if (failed.length > 0) {
      console.log('\n--- Could not reach this run ---')
      for (const entry of failed) console.log(`  · ${entry.name}: ${entry.error}`)
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n--- Notes ---')
    for (const warning of result.warnings) console.log(`  · ${warning}`)
  }

  console.log('\n--- Staying out of trouble ---')
  for (const rule of SAFETY_RULES) console.log(`  · ${rule}`)
  console.log()
}

main().catch((error: unknown) => {
  console.error('Scan failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
