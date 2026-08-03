import 'server-only'

/**
 * Hint text -- SERVER ONLY.
 *
 * Hints cost points, so the client must not be able to read them without the
 * server noticing. Keeping the text here means the only way to see a hint is
 * to ask /api/ctf/hint, which records the usage that the score depends on.
 */
const HINTS: Record<string, string[]> = {
  "c1-1": [
    "Those trailing \"=\" signs are a signature. Only one common encoding pads itself that way.",
    "It is Base64 -- a way of writing raw bytes using only safe printable characters. It is encoding, not encryption: no key, no secret, anyone can undo it.",
    "Open the Difference Engine, choose the Base64 tab, paste the whole block in, and read the countersign at the end of the decoded sentence.",
  ],
  "c1-2": [
    "Each group of eight ones and zeroes is a single byte -- one character of ordinary text.",
    "This is binary. 01001011 is 75 in decimal, and character 75 is \"K\". The rest follow the same rule.",
    "Difference Engine, Binary tab. Paste the lot in, spaces and all.",
  ],
  "c1-3": [
    "Only 0-9 and a-f appear. That is sixteen possible symbols -- base sixteen.",
    "Hexadecimal. Each pair is one byte: \"41\" is 65, which is the letter \"A\". Notice the first word decodes to \"Apothecary\".",
    "Difference Engine, Hex tab, paste it in.",
  ],
  "c2-1": [
    "The evidence board is a web page, and you are a detective. Detectives look behind things.",
    "Right-click the notice and choose \"Inspect\" (or press F12) to open your browser's developer tools. Then read the HTML that produces it -- not the text it displays.",
    "HTML comments look like <!-- this --> and never appear on screen. There is one wrapped around the notice. Expand the element in the Elements panel to find it.",
  ],
  "c2-2": [
    "Start with `ls` to see what is published, then `cat` a file to read it. The courtesy file is the one named after robots.",
    "Run `cat robots.txt`. The \"Disallow\" lines name corridors that are not linked anywhere -- but they are still reachable.",
    "One of the disallowed corridors has a file in it. Try `ls /vault-of-whispers/` and then `cat` what you find there.",
  ],
  "c2-3": [
    "Use `curl -I vault.hollowgear.bh` to ask for the headers only. The `-I` flag means \"head\" -- headers, no body.",
    "One header is not like the others. `X-Brasshaven-Auth` holds a value ending in \"==\".",
    "You have seen that \"==\" before, in Case I. Run the header value through the Base64 tab of the Difference Engine.",
  ],
  "c3-1": [
    "Every letter has been shifted by the same amount. This is a Caesar cipher -- the oldest trick in the book.",
    "You do not need to guess the shift. There are only 25 possibilities, so try all of them. That is called brute force, and here it is entirely practical.",
    "Difference Engine, Caesar tab -- it shows all 25 shifts at once. Look for the row that turns into English. (It is 13, the one they call ROT13.)",
  ],
  "c3-2": [
    "Morse code. A single dot is \"E\", a single dash is \"T\" -- the two commonest letters get the shortest signals.",
    "Decode it and you get a short sentence naming a key phrase of two words.",
    "The flag is the two-word key from the message, in capitals, joined by an underscore, inside BRASS{ }. So: BRASS{FIRST_SECOND}.",
  ],
  "c3-3": [
    "This is a Vigenère cipher: a Caesar shift whose amount cycles through the letters of a keyword.",
    "The keyword is on the letterhead in the drawer above -- the word struck in brass over the door.",
    "Difference Engine, Vigenère tab. Paste the ciphertext, set the key to COGWHEEL, and press Decode. Write the decoded countersign with underscores instead of spaces.",
  ],
  "c4-1": [
    "A hash cannot be reversed -- but it can be recomputed. Hash every name on the roll and compare.",
    "The Difference Engine has a SHA-256 tab. Twelve names is a very small wordlist; a real one has millions.",
    "The evidence board will hash the whole roll for you -- press \"Hash the roll\" and find the row that matches the register. The flag is that keeper's name, lowercase, with an underscore instead of the space: BRASS{first_last}.",
  ],
  "c4-2": [
    "XOR with a single byte. Whatever the key is, it is one of only 256 values.",
    "Try all 256 and look for the one that produces English. This is single-byte XOR brute force, a CTF staple.",
    "Difference Engine, XOR tab -- paste the hex and press \"Try all 256 keys\". Only a handful of results are readable text, and only one is a sentence.",
  ],
  "c4-3": [
    "Watch the query the door builds as you type -- your input is dropped straight between two apostrophes. What happens if your input contains an apostrophe of its own?",
    "Close the quote yourself, then add a condition that is always true. The classic is: ' OR '1'='1",
    "Type   ' OR '1'='1   into the passphrase field (an apostrophe, a space, OR, a space, then '1'='1) and press Speak. The door will match every keeper in the register and open on the first one.",
  ],
  "c5-1": [
    "Layer one is Base64. Decode it and read what comes out -- it is still not English, but it is close to it.",
    "The result has \"OENFF\" where \"BRASS\" belongs. You have met that pattern before, in the first drawer at Iron Hollow.",
    "Layer two is ROT13. Take the Base64 output, paste it into the Caesar tab, and read the shift-13 row.",
  ],
  "c5-2": [
    "The key is the two-word phrase from the telegraph transcription in Case III, drawer two.",
    "That phrase was TELEGRAPH GHOST. A Vigenère key uses letters only -- run the two words together with no space.",
    "Difference Engine, Vigenère tab. Key: TELEGRAPHGHOST. Decode, then write the countersign with underscores instead of spaces.",
  ],
  "m1-1": [
    "Count the alphabet. Twenty-six letters plus six digits is thirty-two symbols, and thirty-two is 2^5.",
    "Base32. Five bits per character instead of the six in Base64, which is why the padding runs longer.",
    "Difference Engine, Base32 tab. Paste the whole block including the equals signs.",
  ],
  "m1-2": [
    "Single-byte XOR gives you readable runs that break and recover at a fixed interval. That interval is the key length.",
    "The key is the company's own name, struck on the brass plate above the door: MERIDIAN.",
    "Difference Engine, Repeating XOR tab. Paste the hex, set the key to MERIDIAN.",
  ],
  "m1-3": [
    "Count the characters in the note, then count the characters you can see. They do not agree.",
    "Zero-width characters -- U+200B and U+200C -- sit between the visible letters. One is a 0, the other a 1.",
    "Difference Engine, Zero-Width tab. Paste the note in; it extracts the bits and turns them into bytes.",
  ],
  "x1-1": [
    "Key length first, plaintext second. Never the other way round.",
    "For each candidate size, take adjacent blocks of that size and compute the normalised Hamming distance. The real size scores lowest.",
    "Once you have the size, slice the ciphertext into that many columns and break each one as an independent single-byte XOR. The Keysize tab does the scoring; the Repeating XOR tab will finish it.",
  ],
  "x1-2": [
    "n is about 2^32. Its square root is about 65,000. That is not a large number of divisions.",
    "Factor n into p and q, then phi = (p-1)(q-1), then d is the modular inverse of e mod phi.",
    "Difference Engine, RSA tab: it factors n, derives d, and decrypts the blocks. Each block is three bytes.",
  ],
  "x2-2": [
    "You are not going to recover the key, and you do not need to.",
    "XOR the two ciphertexts together. The keystream is identical in both, so it cancels: what remains is P1 XOR P2.",
    "XOR that result against the clerk's remembered opening. Whatever falls out is the beginning of the second message -- the Repeating XOR tab will do it if you paste the first result as hex and the crib as the key.",
  ],
}

export function hintsFor(challengeId: string): string[] {
  return HINTS[challengeId] ?? []
}

/** How many hints exist, for the client to render "n of N used". */
export function hintCount(challengeId: string): number {
  return HINTS[challengeId]?.length ?? 0
}
