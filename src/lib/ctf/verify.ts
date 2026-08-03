import { sha256Hex } from './ciphers'

/**
 * Normalises a submitted flag before hashing.
 *
 * Beginners are forgiving territory: case differences, stray whitespace, and
 * spaces where the flag uses underscores should all still count. Several
 * puzzles decode to plaintext with spaces inside the braces, so folding spaces
 * to underscores is deliberate rather than merely lenient.
 */
export function normaliseFlag(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '_')
}

export function checkFlag(input: string, answerHash: string): boolean {
  const candidate = normaliseFlag(input)
  if (!candidate) return false
  return sha256Hex(candidate) === answerHash
}

/**
 * Distinguishes "wrong flag" from "right idea, wrong wrapper" so the game can
 * nudge instead of just saying no.
 */
export function critiqueFlag(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return 'The submission line is empty.'
  if (!/brass/i.test(trimmed)) {
    return 'Countersigns always start with BRASS -- submit the whole thing, braces and all.'
  }
  if (!trimmed.includes('{') || !trimmed.includes('}')) {
    return 'Include the braces: BRASS{like_this}.'
  }
  return null
}
