import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Signed player sessions.
 *
 * A session is just a player id plus an HMAC over it, stored in an httpOnly
 * cookie. The client can read nothing useful and forge nothing: without the
 * server secret it cannot mint a token for another player's id, and httpOnly
 * keeps page scripts away from the cookie entirely.
 *
 * This is not authentication -- there are no passwords, and it is not trying to
 * prove who a human is. It proves that whoever submits a flag is the same
 * browser that claimed the handle, which is what a leaderboard actually needs.
 */

export const SESSION_COOKIE = 'ctf_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90 // 90 days

let cachedSecret: string | null = null

function secret(): string {
  if (cachedSecret) return cachedSecret

  const configured = process.env.CTF_SESSION_SECRET
  if (configured && configured.length >= 16) {
    cachedSecret = configured
    return cachedSecret
  }

  if (process.env.NODE_ENV === 'production') {
    // Failing loudly beats silently issuing tokens that every deployment
    // instance signs differently -- players would be logged out at random and
    // scores would scatter across phantom identities.
    throw new Error(
      'CTF_SESSION_SECRET must be set (32+ random characters) to run the leaderboard in production',
    )
  }

  // Development convenience only: a per-boot secret. Restarting the dev server
  // invalidates existing sessions, which is fine locally.
  cachedSecret = randomBytes(32).toString('hex')
  console.warn('[ctf] CTF_SESSION_SECRET is not set -- using a temporary development secret')
  return cachedSecret
}

function sign(playerId: string): string {
  return createHmac('sha256', secret()).update(playerId).digest('hex')
}

export function createSessionToken(playerId: string): string {
  return `${playerId}.${sign(playerId)}`
}

/** Returns the player id only if the signature is valid. */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const playerId = token.slice(0, separator)
  const providedSignature = token.slice(separator + 1)
  const expectedSignature = sign(playerId)

  // Both are hex of the same length, so a length mismatch is already a failure
  // and timingSafeEqual would throw on it.
  if (providedSignature.length !== expectedSignature.length) return null

  const matches = timingSafeEqual(
    Buffer.from(providedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex'),
  )

  return matches ? playerId : null
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}
