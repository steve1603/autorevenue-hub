import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sha256Hex } from '@/lib/ctf/ciphers'
import { normaliseFlag } from '@/lib/ctf/verify'
import { isCorrectFlag } from '@/lib/ctf/server/answers'
import { debriefFor } from '@/lib/ctf/server/debriefs'
import { awardFor, challengeById, rateLimited } from '@/lib/ctf/server/scoring'
import { getStore } from '@/lib/ctf/server/store'
import { SESSION_COOKIE, readSessionToken } from '@/lib/ctf/server/session'

export const dynamic = 'force-dynamic'

/**
 * Validates a flag. This is the only place a flag is ever checked.
 *
 * Anyone can submit -- unregistered players get told whether they are right, so
 * the game still works without joining the leaderboard. Only a valid session
 * causes the solve to be recorded and scored.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const { challengeId, flag } = (body ?? {}) as { challengeId?: unknown; flag?: unknown }

  if (typeof challengeId !== 'string' || typeof flag !== 'string') {
    return NextResponse.json({ error: 'Send a challengeId and a flag.' }, { status: 400 })
  }

  const challenge = challengeById(challengeId)
  if (!challenge) {
    return NextResponse.json({ error: 'No such challenge.' }, { status: 404 })
  }

  const playerId = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)

  // Rate limit per player where we can identify one, and per challenge
  // otherwise, so guessing at flags is never cheap.
  if (rateLimited(`${playerId ?? 'anonymous'}:${challengeId}`)) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute and try again.' },
      { status: 429 },
    )
  }

  const correct = isCorrectFlag(challengeId, normaliseFlag(flag), sha256Hex)
  if (!correct) {
    return NextResponse.json({ correct: false })
  }

  // Earned content: released only now that the flag has been proven right.
  const debrief = debriefFor(challengeId)

  if (!playerId) {
    // Correct, but nothing to record -- playing without a handle.
    return NextResponse.json({ correct: true, recorded: false, points: 0, debrief })
  }

  const store = getStore()
  const player = await store.getPlayer(playerId)
  if (!player) {
    return NextResponse.json({ correct: true, recorded: false, points: 0, debrief })
  }

  const existing = await store.getSolves(playerId)
  const already = existing.find((s) => s.challengeId === challengeId)
  if (already) {
    return NextResponse.json({
      correct: true,
      recorded: true,
      alreadySolved: true,
      points: already.points,
      debrief,
    })
  }

  // Hint usage comes from the server's own record, never from the client, so
  // the penalty cannot be dodged by lying about how many hints were read.
  const hintCounts = await store.getHintCounts(playerId)
  const hintsUsed = hintCounts[challengeId] ?? 0
  const points = awardFor(challenge, hintsUsed)

  await store.recordSolve(playerId, challengeId, points, hintsUsed)

  return NextResponse.json({ correct: true, recorded: true, points, hintsUsed, debrief })
}
