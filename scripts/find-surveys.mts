#!/usr/bin/env node
/**
 * Command-line runner for the survey finder.
 *
 *   npm run surveys                                  # rank everything
 *   npm run surveys -- --target 25 --region US       # plan for a $25 card
 *   npm run surveys -- --min-hourly 5 --no-invite    # only what's worth the time
 *   npm run surveys -- --json > report.json
 *
 * Runs on Node's built-in TypeScript stripping (Node 22.18+), so there is no
 * build step and no dependency to install.
 */
import { scan } from '../src/lib/surveys/scanner.ts'
import { SAFETY_RULES } from '../src/lib/surveys/scam-filter.ts'
import { DATA_VINTAGE } from '../src/lib/surveys/panels.ts'
import type { PanelKind, ScanOptions } from '../src/lib/surveys/types.ts'

const KINDS: PanelKind[] = ['survey-panel', 'gpt-router', 'research-study', 'microtask']

const KIND_LABELS: Record<PanelKind, string> = {
  'research-study': 'paid study',
  'survey-panel': 'survey panel',
  'gpt-router': 'router/offers',
  microtask: 'microtask',
}

const USAGE = `
Finds surveys and paid studies worth filling out, ranked by what they really pay
per hour once screen-outs are priced in.

Usage: npm run surveys -- [options]

  --target <usd>      Gift card value you're working toward (default 25)
  --region <CC>       Only platforms operating in this country, e.g. US, GB
  --min-hourly <usd>  Hide anything paying below this effective hourly rate
  --no-invite         Exclude invite-only platforms you can't just join
  --kind <kind>       ${KINDS.join(' | ')}
  --brand <name>      Only platforms paying out in this card, e.g. Amazon
  --panels-only       Skip crawling for individual open studies
  --offline           No network access; rank the catalog without checking it
  --limit <n>         Maximum open studies to list (default 40)
  --timeout <ms>      Per-request timeout (default 12000)
  --json              Emit raw JSON instead of a readable report
  --help              Show this message

Set BRAVE_SEARCH_API_KEY to search beyond the curated feeds.
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
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
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
      case '--no-invite':
        options.excludeInviteOnly = true
        break
      case '--panels-only':
        options.panelsOnly = true
        break
      case '--offline':
        options.offline = true
        break
      case '--region':
        options.region = next(i, arg).toUpperCase()
        i++
        break
      case '--brand':
        options.brand = next(i, arg)
        i++
        break
      case '--kind': {
        const value = next(i, arg).toLowerCase()
        if (!KINDS.includes(value as PanelKind)) {
          throw new Error(`--kind must be one of: ${KINDS.join(', ')}`)
        }
        options.kind = value as PanelKind
        i++
        break
      }
      case '--target':
        options.targetUsd = requirePositiveNumber(next(i, arg), '--target')
        i++
        break
      case '--min-hourly':
        options.minHourlyUsd = requirePositiveNumber(next(i, arg), '--min-hourly')
        i++
        break
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

function requirePositiveNumber(raw: string, flag: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} must be a positive number`)
  return value
}

function hours(value: number): string {
  if (!Number.isFinite(value)) return 'never'
  if (value < 1) return `${Math.round(value * 60)} min`
  return `${value.toFixed(1)} hr`
}

function weeks(value: number): string {
  if (!Number.isFinite(value)) return 'never'
  if (value < 1) return `${Math.round(value * 7)} days`
  if (value > 52) return 'over a year'
  return `${value.toFixed(1)} weeks`
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

  const target = parsed.options.targetUsd ?? 25
  const { stats } = result

  console.log('\n=== Surveys worth your time ===')
  console.log(
    `${new Date(result.scannedAt).toLocaleString()} · ${stats.panelsConsidered} platforms · ` +
      `${stats.panelsReachable} reachable · ${stats.opportunitiesFound} open studies · ` +
      `${stats.opportunitiesBlocked} scams filtered · ${(stats.durationMs / 1000).toFixed(1)}s`,
  )
  console.log(`Target: a $${target} gift card. Rates are per hour of actual attention.`)

  console.log('\n--- Ranked by real hourly rate ---')
  for (const entry of result.panels) {
    const { panel, economics, plan } = entry
    const flags = [
      KIND_LABELS[panel.kind],
      panel.inviteOnly ? 'invite only' : null,
      panel.mobileOnly ? 'phone only' : null,
      `cash out at $${panel.minCashoutUsd}`,
      panel.payoutSpeed,
    ]
      .filter(Boolean)
      .join(' · ')

    console.log(`\n[${String(entry.score).padStart(3)}] ${panel.name}`)
    console.log(
      `      $${economics.effectiveHourlyUsd.toFixed(2)}/hr real ` +
        `(vs $${economics.nominalHourlyUsd.toFixed(2)}/hr advertised) · ` +
        `$${economics.usdPerSurvey.toFixed(2)} per survey · ` +
        `${Math.round(panel.screenOutRate * 100)}% screened out`,
    )
    console.log(
      `      Realistically ~$${economics.realisticWeeklyUsd.toFixed(2)}/week ` +
        `at about ${panel.typicalSurveysPerWeek} surveys available per week`,
    )

    if (plan) {
      if (plan.reachable) {
        console.log(
          `      To $${target}: ~${plan.surveysNeeded} surveys, ${hours(plan.hoursNeeded)} of work, ` +
            `about ${weeks(plan.weeksNeeded)} at this platform's volume`,
        )
      } else {
        console.log(`      To $${target}: not directly — ${plan.blockedReason}`)
      }
    }

    console.log(`      ${flags}`)
    console.log(`      Pays in: ${panel.giftCards.join(', ') || 'n/a'}`)
    console.log(`      ${panel.url}`)
    console.log(`      ${panel.notes}`)
    if (entry.risk.level !== 'clean') {
      console.log(`      RISK (${entry.risk.level}): ${entry.risk.reasons.join('; ')}`)
    }
    if (!entry.liveness.ok && !parsed.options.offline) {
      console.log(`      (not verified this run: ${entry.liveness.error ?? 'unknown'})`)
    }
  }

  if (result.opportunities.length > 0) {
    console.log('\n--- Open studies found right now ---')
    for (const item of result.opportunities) {
      const bits = [
        item.payoutUsd !== undefined ? `$${item.payoutUsd}` : null,
        item.minutes !== undefined ? `${item.minutes} min` : null,
      ].filter(Boolean)

      console.log(`\n[${String(item.score).padStart(3)}] ${item.title}`)
      if (bits.length > 0) console.log(`      ${bits.join(' · ')}`)
      console.log(`      ${item.panelName} · ${item.url}`)
      if (item.risk.level !== 'clean') {
        console.log(`      CAUTION: ${item.risk.reasons.join('; ')}`)
      }
    }
  } else if (!parsed.options.panelsOnly && !parsed.options.offline) {
    console.log('\n--- No open studies matched right now. Listings turn over hourly. ---')
  }

  if (result.blocked.length > 0) {
    console.log(`\n--- Filtered out as likely scams (${result.blocked.length}) ---`)
    for (const entry of result.blocked.slice(0, 10)) {
      console.log(`  · ${entry.title}`)
      console.log(`    ${entry.reasons.join('; ')}`)
    }
  }

  if (result.robotsBlocked.length > 0) {
    console.log('\n--- Not checked: these sites ask crawlers to stay out ---')
    console.log('    (the platforms are fine, this tool just does not read their pages)')
    for (const entry of result.robotsBlocked) console.log(`  · ${entry.name}`)
  }

  if (result.failed.length > 0) {
    console.log('\n--- Could not reach this run ---')
    for (const entry of result.failed) console.log(`  · ${entry.name}: ${entry.error}`)
  }

  if (result.warnings.length > 0) {
    console.log('\n--- Notes ---')
    for (const warning of result.warnings) console.log(`  · ${warning}`)
  }

  console.log('\n--- Staying out of trouble ---')
  for (const rule of SAFETY_RULES) console.log(`  · ${rule}`)

  console.log(
    `\nRates are estimates calibrated ${DATA_VINTAGE}; screen-out rates especially vary by` +
      '\ndemographic. Tune src/lib/surveys/panels.ts against your own results.\n',
  )
}

main().catch((error: unknown) => {
  console.error('Scan failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
