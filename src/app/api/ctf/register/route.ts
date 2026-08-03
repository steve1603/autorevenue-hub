import { NextResponse } from 'next/server'
import { getStore } from '@/lib/ctf/server/store'
import { normaliseHandle } from '@/lib/ctf/server/scoring'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  sessionsAvailable,
} from '@/lib/ctf/server/session'

export const dynamic = 'force-dynamic'

/** Claims a handle and issues a signed session cookie. */
export async function POST(request: Request) {
  if (!sessionsAvailable()) {
    return NextResponse.json(
      {
        error:
          'The honours board is closed -- this server has no CTF_SESSION_SECRET configured. You can still play; solves just will not be recorded.',
      },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const handle = normaliseHandle((body as { handle?: unknown })?.handle)
  if (!handle) {
    return NextResponse.json(
      { error: 'Pick a name of 2-24 characters, letters and numbers only.' },
      { status: 400 },
    )
  }

  const store = getStore()
  const player = await store.createPlayer(handle)

  if (player === 'handle-taken') {
    return NextResponse.json(
      { error: 'That name is already on the board. Pick another.' },
      { status: 409 },
    )
  }

  const response = NextResponse.json({ handle: player.handle, persistent: store.persistent })
  response.cookies.set(SESSION_COOKIE, createSessionToken(player.id), sessionCookieOptions())
  return response
}
