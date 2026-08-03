import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * The Iron Hollow vault door.
 *
 * The injection is evaluated here, not in the browser, for two reasons: the
 * countersign is only released to someone who actually performed the bypass,
 * and a query being built out of user input server-side is what the challenge
 * is teaching in the first place.
 *
 * Nothing here touches a real database -- the "query" is a story prop.
 */

/** `' OR '1'='1`, `' or 1=1`, `" || 2>1` -- a quote then an always-true clause. */
const TAUTOLOGY = /['"]\s*(or|\|\|)\s+[^\s]+\s*=\s*[^\s]+/i
/** `admin'--`, `admin'#` -- a quote then a comment that discards the rest. */
const COMMENTED = /['"]\s*(--|#|\/\*)/

const SECRET = 'BRASS{apostrophe_opens_all_doors}'
const KEEPERS = ['ignatius rook', 'wilhelmina cog', 'thaddeus ash']

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const { name, phrase } = (body ?? {}) as { name?: unknown; phrase?: unknown }
  if (typeof name !== 'string' || typeof phrase !== 'string') {
    return NextResponse.json({ error: 'Send a name and a phrase.' }, { status: 400 })
  }
  if (name.length > 200 || phrase.length > 200) {
    return NextResponse.json({ error: 'That is far too long for the speaking tube.' }, { status: 400 })
  }

  const injected = (value: string) => TAUTOLOGY.test(value) || COMMENTED.test(value)

  if (injected(name) || injected(phrase)) {
    return NextResponse.json({ result: 'open', keepers: KEEPERS, secret: SECRET })
  }

  // An unbalanced quote breaks the sentence the door built -- the "that's an odd
  // error message" moment that starts a real assessment.
  const quotes = (name + phrase).split("'").length - 1
  if (quotes % 2 === 1) {
    return NextResponse.json({
      result: 'fault',
      detail:
        'ENGINE FAULT: unterminated string near "\'" -- the register could not parse the sentence the door built.',
    })
  }

  return NextResponse.json({ result: 'denied' })
}
