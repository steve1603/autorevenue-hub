import { NextRequest, NextResponse } from 'next/server'
import { scan } from '@/lib/giftcards/scanner'
import { SAFETY_RULES } from '@/lib/giftcards/scam-filter'
import type { EffortLevel, ScanOptions, ScanResult } from '@/lib/giftcards/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EFFORT_LEVELS: EffortLevel[] = ['passive', 'low', 'medium', 'high']

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

  const maxEffortParam = searchParams.get('maxEffort')?.trim().toLowerCase()
  if (maxEffortParam && !EFFORT_LEVELS.includes(maxEffortParam as EffortLevel)) {
    return NextResponse.json(
      { error: `maxEffort must be one of: ${EFFORT_LEVELS.join(', ')}` },
      { status: 400 },
    )
  }

  const limit = parseBoundedInt(searchParams.get('limit'), 40, 1, 100)
  if (limit === undefined) {
    return NextResponse.json({ error: 'limit must be an integer between 1 and 100' }, { status: 400 })
  }

  const options: ScanOptions = {
    region,
    maxEffort: maxEffortParam as EffortLevel | undefined,
    noPurchaseOnly: searchParams.get('noPurchaseOnly') === 'true',
    programsOnly: searchParams.get('programsOnly') === 'true',
    offline: searchParams.get('offline') === 'true',
    limit,
  }

  const cacheKey = JSON.stringify(options)
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ ...cached.result, cached: true, safetyRules: SAFETY_RULES })
  }

  try {
    const result = await scan(options)
    cache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS })
    evictExpired(now)
    return NextResponse.json({ ...result, cached: false, safetyRules: SAFETY_RULES })
  } catch (error) {
    console.error('Gift card scan failed:', error)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}

function parseBoundedInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number | undefined {
  if (raw === null || raw.trim() === '') return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}

function evictExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}
