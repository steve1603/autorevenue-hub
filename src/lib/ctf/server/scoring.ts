import 'server-only'

import { ALL_CHALLENGES, pointsFor, type Challenge } from '../cases'

/**
 * Authoritative scoring.
 *
 * The client never sends a score -- it sends a flag, and the server decides what
 * that solve was worth based on hint usage it recorded itself. This is the whole
 * reason the leaderboard can be trusted.
 */

export function challengeById(id: string): Challenge | undefined {
  return ALL_CHALLENGES.find((c) => c.id === id)
}

export function awardFor(challenge: Challenge, hintsUsed: number): number {
  return pointsFor(challenge, hintsUsed)
}

/** Simple fixed-window rate limit, per player, per challenge. */
const attempts = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 30

export function rateLimited(key: string): boolean {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now })
    return false
  }

  record.count += 1
  return record.count > MAX_ATTEMPTS
}

/**
 * Handles are shown publicly on the leaderboard, so keep them short, printable
 * and free of anything that could be mistaken for markup.
 */
export function normaliseHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (trimmed.length < 2 || trimmed.length > 24) return null
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(trimmed)) return null
  return trimmed
}
