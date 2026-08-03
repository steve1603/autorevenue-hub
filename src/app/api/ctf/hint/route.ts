import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hintsFor } from '@/lib/ctf/server/hints'
import { challengeById } from '@/lib/ctf/server/scoring'
import { getStore } from '@/lib/ctf/server/store'
import { SESSION_COOKIE, readSessionToken } from '@/lib/ctf/server/session'

export const dynamic = 'force-dynamic'

/**
 * Reveals the next hint and records that it was taken.
 *
 * Serving the text from here is what makes the hint penalty real: there is no
 * copy in the bundle to read for free.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const { challengeId } = (body ?? {}) as { challengeId?: unknown }
  if (typeof challengeId !== 'string') {
    return NextResponse.json({ error: 'Send a challengeId.' }, { status: 400 })
  }

  if (!challengeById(challengeId)) {
    return NextResponse.json({ error: 'No such challenge.' }, { status: 404 })
  }

  const hints = hintsFor(challengeId)
  const playerId = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)

  // Without a session there is no score to protect, so hints are simply free.
  if (!playerId) {
    return NextResponse.json({ hints, hintsUsed: hints.length, recorded: false })
  }

  const store = getStore()
  if (!(await store.getPlayer(playerId))) {
    return NextResponse.json({ hints, hintsUsed: hints.length, recorded: false })
  }

  const counts = await store.getHintCounts(playerId)
  const alreadyUsed = counts[challengeId] ?? 0

  if (alreadyUsed >= hints.length) {
    return NextResponse.json({ hints, hintsUsed: alreadyUsed, recorded: true })
  }

  const hintsUsed = await store.recordHint(playerId, challengeId)

  return NextResponse.json({ hints: hints.slice(0, hintsUsed), hintsUsed, recorded: true })
}
