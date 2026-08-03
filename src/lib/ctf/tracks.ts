import { CASES as NOVICE_CASES, type CaseFile, type Challenge, type Rank } from './cases'
import { GHOST_CASES, INSPECTOR_CASES } from './cases-advanced'

/**
 * Difficulty tracks.
 *
 * Each track is a self-contained run with its own cases, points and rank
 * ladder, so an experienced player is not made to grind through Base64 to reach
 * the interesting material. Challenge ids are globally unique and prefixed by
 * track (`c` novice, `m` inspector, `x` ghost), which lets the server work out
 * which track a solve belongs to without storing it.
 */

export type Difficulty = 'novice' | 'inspector' | 'ghost'

export interface Track {
  id: Difficulty
  name: string
  /** The one-line pitch on the difficulty picker. */
  tagline: string
  /** Who this is for, said plainly. */
  audience: string
  /** What it actually teaches. */
  covers: string
  cases: CaseFile[]
  ranks: Rank[]
}

const NOVICE_RANKS: Rank[] = [
  { title: 'Apprentice Sleuth', at: 0 },
  { title: 'Constable of the Cog', at: 300 },
  { title: 'Inspector, Third Gear', at: 750 },
  { title: 'Inspector, First Gear', at: 1400 },
  { title: 'Chief Cipher Detective', at: 2200 },
  { title: 'Ghost of Brasshaven', at: 2950 },
]

const INSPECTOR_RANKS: Rank[] = [
  { title: 'Seconded to the Meridian', at: 0 },
  { title: 'Reader of Manifests', at: 700 },
  { title: 'Warden of the Ticket Office', at: 1500 },
  { title: 'Auditor of the Countinghouse', at: 2200 },
  { title: 'Meridian Inspector', at: 2700 },
]

const GHOST_RANKS: Rank[] = [
  { title: 'Trespasser', at: 0 },
  { title: 'Clerk of the Drum Room', at: 900 },
  { title: 'Breaker of Keys', at: 1800 },
  { title: 'Engine Reader', at: 2600 },
  { title: 'The Iron Meridian', at: 3150 },
]

export const TRACKS: Track[] = [
  {
    id: 'novice',
    name: 'The Brasshaven Files',
    tagline: 'Five cases. Start here if you have never captured a flag.',
    audience: 'Complete beginners. No command line, no prior security knowledge.',
    covers: 'Base64, hex, binary, page source, robots.txt, HTTP headers, Caesar, Morse, Vigenère, hash cracking, SQL injection',
    cases: NOVICE_CASES,
    ranks: NOVICE_RANKS,
  },
  {
    id: 'inspector',
    name: 'The Iron Meridian',
    tagline: 'Three cases. For players who already know what Base64 looks like.',
    audience: 'Anyone comfortable with the basics who wants real techniques.',
    covers: 'Base32, repeating-key XOR, zero-width steganography, JWT forgery, cookie tampering, path traversal, frequency analysis, UNION injection, predictable tokens',
    cases: INSPECTOR_CASES,
    ranks: INSPECTOR_RANKS,
  },
  {
    id: 'ghost',
    name: 'The Drum Room',
    tagline: 'Two cases, no hand-holding. Bring your own methodology.',
    audience: 'Experienced players. These are real attacks, not demonstrations.',
    covers: 'Keysize recovery by Hamming distance, RSA modulus factoring, JWT algorithm confusion, blind boolean injection, keystream reuse, layered classical ciphers',
    cases: GHOST_CASES,
    ranks: GHOST_RANKS,
  },
]

export const DEFAULT_TRACK: Difficulty = 'novice'

export function trackFor(id: string | null | undefined): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}

/** Works the track out from the challenge id prefix, so nothing has to store it. */
export function difficultyOf(challengeId: string): Difficulty {
  if (challengeId.startsWith('m')) return 'inspector'
  if (challengeId.startsWith('x')) return 'ghost'
  return 'novice'
}

export function casesFor(difficulty: Difficulty): CaseFile[] {
  return trackFor(difficulty).cases
}

export function challengesFor(difficulty: Difficulty): Challenge[] {
  return casesFor(difficulty).flatMap((c) => c.challenges)
}

export function totalPointsFor(difficulty: Difficulty): number {
  return challengesFor(difficulty).reduce((sum, ch) => sum + ch.points, 0)
}

export function rankForTrack(difficulty: Difficulty, points: number): Rank {
  const ranks = trackFor(difficulty).ranks
  return [...ranks].reverse().find((r) => points >= r.at) ?? ranks[0]
}

/** Every challenge in every track -- used by the server to validate an id. */
export const EVERY_CHALLENGE: Challenge[] = TRACKS.flatMap((t) =>
  t.cases.flatMap((c) => c.challenges),
)

export function challengeById(id: string): Challenge | undefined {
  return EVERY_CHALLENGE.find((c) => c.id === id)
}
