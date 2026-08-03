import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hintsFor } from '@/lib/ctf/server/hints'
import { debriefFor } from '@/lib/ctf/server/debriefs'
import { getStore } from '@/lib/ctf/server/store'
import { SESSION_COOKIE, readSessionToken, sessionsAvailable } from '@/lib/ctf/server/session'

export const dynamic = 'force-dynamic'

/**
 * The player's progress, as the server sees it. This is the source of truth the
 * client renders from -- localStorage is no longer trusted for anything that
 * affects a score.
 */
export async function GET() {
  const playerId = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
  const store = getStore()

  if (!playerId) {
    return NextResponse.json({ player: null, solved: {}, hints: {}, persistent: store.persistent, leaderboardEnabled: sessionsAvailable() })
  }

  const player = await store.getPlayer(playerId)
  if (!player) {
    return NextResponse.json({ player: null, solved: {}, hints: {}, persistent: store.persistent, leaderboardEnabled: sessionsAvailable() })
  }

  const [solves, hintCounts] = await Promise.all([
    store.getSolves(playerId),
    store.getHintCounts(playerId),
  ])

  // Hints already paid for are returned with their text, so a refresh does not
  // hide what the player has already been charged for.
  const hints: Record<string, { used: number; text: string[] }> = {}
  for (const [challengeId, used] of Object.entries(hintCounts)) {
    hints[challengeId] = { used, text: hintsFor(challengeId).slice(0, used) }
  }

  return NextResponse.json({
    player: { handle: player.handle },
    solved: Object.fromEntries(solves.map((s) => [s.challengeId, s.points])),
    debriefs: Object.fromEntries(solves.map((s) => [s.challengeId, debriefFor(s.challengeId)])),
    hints,
    persistent: store.persistent,
    leaderboardEnabled: sessionsAvailable(),
  })
}
