/**
 * Cipher and encoding helpers for the Brasshaven Files.
 *
 * Every function here is pure and browser-safe so the in-game Difference Engine
 * workbench can run them without a round trip to the server. Beginners are meant
 * to solve the cases with these tools alone -- no external websites required.
 */

/* ------------------------------------------------------------------ base64 */

export function decodeBase64(input: string): string {
  const cleaned = input.replace(/\s+/g, '')
  if (!cleaned) return ''
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error('That is not valid Base64 -- it may only contain A-Z, a-z, 0-9, + and /')
  }
  const binary = atob(cleaned)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

/* --------------------------------------------------------------------- hex */

export function decodeHex(input: string): string {
  const cleaned = input.replace(/0x/gi, '').replace(/[\s,:]+/g, '')
  if (!cleaned) return ''
  if (cleaned.length % 2 !== 0) {
    throw new Error('Hex needs an even number of digits -- every byte is two of them')
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new Error('That is not valid hex -- it may only contain 0-9 and a-f')
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

export function encodeHex(input: string): string {
  return Array.from(new TextEncoder().encode(input))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

/* ------------------------------------------------------------------ binary */

export function decodeBinary(input: string): string {
  const cleaned = input.replace(/[^01]/g, '')
  if (!cleaned) return ''
  if (cleaned.length % 8 !== 0) {
    throw new Error('Binary text comes in groups of 8 bits -- check for a missing digit')
  }
  const bytes = new Uint8Array(cleaned.length / 8)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 8, i * 8 + 8), 2)
  }
  return new TextDecoder().decode(bytes)
}

export function encodeBinary(input: string): string {
  return Array.from(new TextEncoder().encode(input))
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ')
}

/* ------------------------------------------------------------------ caesar */

export function caesarShift(input: string, shift: number): string {
  const n = ((shift % 26) + 26) % 26
  return input.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    return String.fromCharCode(((ch.charCodeAt(0) - base + n) % 26) + base)
  })
}

/** Every one of the 25 possible Caesar shifts -- the classic brute-force table. */
export function caesarBruteForce(input: string): { shift: number; text: string }[] {
  return Array.from({ length: 25 }, (_, i) => ({
    shift: i + 1,
    text: caesarShift(input, i + 1),
  }))
}

/* ---------------------------------------------------------------- vigenere */

function vigenere(input: string, key: string, direction: 1 | -1): string {
  const letters = key.replace(/[^a-zA-Z]/g, '')
  if (!letters) throw new Error('A Vigenere key must contain at least one letter')
  let keyIndex = 0
  return input.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    const k = letters[keyIndex % letters.length].toUpperCase().charCodeAt(0) - 65
    keyIndex++
    return String.fromCharCode(((ch.charCodeAt(0) - base + direction * k + 26) % 26) + base)
  })
}

export const vigenereEncode = (input: string, key: string) => vigenere(input, key, 1)
export const vigenereDecode = (input: string, key: string) => vigenere(input, key, -1)

/* ------------------------------------------------------------------- morse */

const MORSE_TABLE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
}

const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([letter, code]) => [code, letter]),
)

export function decodeMorse(input: string): string {
  const normalised = input.trim().replace(/_/g, '-').replace(/\s+/g, ' ')
  if (!normalised) return ''
  return normalised
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .split(' ')
        .filter(Boolean)
        .map((code) => MORSE_REVERSE[code] ?? '?')
        .join(''),
    )
    .join(' ')
}

export function encodeMorse(input: string): string {
  return input
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word)
        .map((ch) => MORSE_TABLE[ch] ?? '')
        .filter(Boolean)
        .join(' '),
    )
    .join(' / ')
}

/* --------------------------------------------------------------------- xor */

function parseHexBytes(input: string): Uint8Array {
  const cleaned = input.replace(/0x/gi, '').replace(/[\s,:]+/g, '')
  if (cleaned.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('XOR expects hex bytes, e.g. "7c 4b 5f"')
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function xorWithByte(hexInput: string, key: number): string {
  const bytes = parseHexBytes(hexInput)
  return Array.from(bytes, (b) => String.fromCharCode(b ^ key)).join('')
}

/**
 * Tries all 256 single-byte keys and keeps the results that look like English.
 * This is exactly how a real single-byte XOR is broken.
 */
export function xorBruteForce(hexInput: string): { key: number; text: string; score: number }[] {
  const bytes = parseHexBytes(hexInput)
  const results = []
  for (let key = 0; key < 256; key++) {
    const text = Array.from(bytes, (b) => String.fromCharCode(b ^ key)).join('')
    const printable = text.split('').filter((c) => /[ -~]/.test(c)).length
    const lettersAndSpaces = text.split('').filter((c) => /[a-zA-Z ]/.test(c)).length
    // Reject anything with unprintable bytes outright, then rank by how much of
    // the result is ordinary English text.
    const score = printable < text.length ? 0 : lettersAndSpaces / text.length
    results.push({ key, text, score })
  }
  return results.filter((r) => r.score > 0.6).sort((a, b) => b.score - a.score)
}

/* ------------------------------------------------------------------ sha256 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

/**
 * SHA-256, implemented in plain TypeScript on purpose.
 *
 * `crypto.subtle` only exists in secure contexts (https or localhost), and flag
 * checking must not silently break when the game is served over plain http on a
 * LAN address. This runs everywhere and is plenty fast for short strings.
 */
export function sha256Hex(input: string): string {
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]

  const bytes = new TextEncoder().encode(input)
  const bitLength = bytes.length * 8
  // Append 0x80, pad with zeroes, then the 64-bit big-endian length.
  const paddedLength = (((bytes.length + 9) / 64) | 0) * 64 + ((bytes.length + 9) % 64 ? 64 : 0)
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(paddedLength - 4, bitLength >>> 0)

  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      hh = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    const next = [a, b, c, d, e, f, g, hh]
    for (let i = 0; i < 8; i++) h[i] = (h[i] + next[i]) >>> 0
  }

  return h.map((x) => x.toString(16).padStart(8, '0')).join('')
}
