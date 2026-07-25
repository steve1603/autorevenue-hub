import { NextRequest, NextResponse } from 'next/server'
import { scan } from '@/lib/surveys/scanner'
import { SAFETY_RULES } from '@/lib/surveys/scam-filter'
import { DATA_VINTAGE } from '@/lib/surveys/panels'
import type { PanelKind, ScanOptions, ScanResult } from '@/lib/surveys/types'

export const dynamic = 'force-dynamic'
// Scans fan out to third-party sites, so this needs more than the 15s default.
export const maxDuration = 30

const KINDS: PanelKind[] = ['survey-panel', 'gpt-router', 'research-study', 'microtask']

// Scans hit third-party sites, so results are reused briefly rather than
// re-crawling on every page load. In-memory is fine for a single instance;
// move to a shared cache if this ever runs on more than one.
const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { result: ScanResult; expiresAt: number }>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const region = searchParams.get('region')?.trim().toUpperCase() || undefined
  if (region && !/^[A-Z]{2}$/.test(region)) {
    return NextResponse.json({ error: 'region must be a two-letter country code' }, { status: 400 })
  }

  const kindParam = searchParams.get('kind')?.trim().toLowerCase()
  if (kindParam && !KINDS.includes(kindParam as PanelKind)) {
    return NextResponse.json({ error: `kind must be one of: ${KINDS.join(', ')}` }, { status: 400 })
  }

  const targetUsd = parseBoundedNumber(searchParams.get('targetUsd'), 25, 1, 1000)
  if (targetUsd === undefined) {
    return NextResponse.json({ error: 'targetUsd must be between 1 and 1000' }, { status: 400 })
  }

  const minHourlyUsd = parseBoundedNumber(searchParams.get('minHourlyUsd'), undefined, 0, 1000)
  if (minHourlyUsd === undefined && searchParams.get('minHourlyUsd')) {
    return NextResponse.json({ error: 'minHourlyUsd must be between 0 and 1000' }, { status: 400 })
  }

  const limit = parseBoundedNumber(searchParams.get('limit'), 40, 1, 100)
  if (limit === undefined || !Number.isInteger(limit)) {
    return NextResponse.json({ error: 'limit must be an integer between 1 and 100' }, { status: 400 })
  }

  const brand = searchParams.get('brand')?.trim().slice(0, 40) || undefined

  const options: ScanOptions = {
    region,
    targetUsd,
    minHourlyUsd,
    brand,
    kind: kindParam as PanelKind | undefined,
    excludeInviteOnly: searchParams.get('excludeInviteOnly') === 'true',
    panelsOnly: searchParams.get('panelsOnly') === 'true',
    offline: searchParams.get('offline') === 'true',
    limit,
  }

  const cacheKey = JSON.stringify(options)
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      ...cached.result,
      cached: true,
      safetyRules: SAFETY_RULES,
      dataVintage: DATA_VINTAGE,
    })
  }

  try {
    const result = await scan(options)
    cache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS })
    evictExpired(now)
    return NextResponse.json({
      ...result,
      cached: false,
      safetyRules: SAFETY_RULES,
      dataVintage: DATA_VINTAGE,
    })
  } catch (error) {
    console.error('Survey scan failed:', error)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}

/** Returns `fallback` for an absent value, or undefined when out of range. */
function parseBoundedNumber(
  raw: string | null,
  fallback: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (raw === null || raw.trim() === '') return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}

function evictExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}
