import { NextResponse } from 'next/server'
import { getStore } from '@/lib/ctf/server/store'
import { sessionsAvailable } from '@/lib/ctf/server/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const track = params.get('track') ?? undefined
  const requested = Number(params.get('limit') ?? 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 50) : 10

  const store = getStore()
  const entries = await store.leaderboard(limit, track)

  return NextResponse.json({
    entries: entries.map((entry, index) => ({
      rank: index + 1,
      handle: entry.handle,
      score: entry.score,
      solves: entry.solves,
      hintsUsed: entry.hintsUsed,
      // Elapsed time between first and last solve. A run that completes
      // everything in seconds is visible here for what it is.
      durationMs:
        entry.firstSolveAt && entry.lastSolveAt
          ? new Date(entry.lastSolveAt).getTime() - new Date(entry.firstSolveAt).getTime()
          : 0,
    })),
    persistent: store.persistent,
    leaderboardEnabled: sessionsAvailable(),
  })
}
