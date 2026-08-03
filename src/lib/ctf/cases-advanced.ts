import type { CaseFile } from './cases'

/**
 * The Inspector and Ghost tracks.
 *
 * Same rule as the novice cases: this module ships to the browser, so it holds
 * narrative and evidence only. Answers, hints, debriefs and anything a server
 * must judge live under src/lib/ctf/server/.
 *
 * Briefs are deliberately terser here. The novice track explains what to look
 * for; these two describe what you are holding and let you work it out.
 *
 * Long ciphertexts are injected by a generator rather than typed. The
 * zero-width payload in VI-3 in particular ships as \u escapes because the real
 * characters are invisible and any copy-paste would silently destroy it.
 */

export const INSPECTOR_CASES: CaseFile[] = [
  {
    id: 'case-6',
    number: 'VI',
    title: 'The Cargo Manifest',
    subtitle: 'In which a dead company files paperwork',
    epigraph:
      'Six weeks after the Hollow Gear burned its own books, somebody started filing manifests again. Same hand. New letterhead.',
    brief: `You did not get on the ship.

You stayed, you paid the rent, and for six weeks nothing happened. Then a shipping concern calling itself the Iron Meridian filed a cargo manifest at Dock Nine, and the countersign block at the bottom was formatted exactly the way the Hollow Gear used to format theirs.

The Meridian encodes better than the Gear did. Not well. Better.`,
    challenges: [
      {
        id: 'm1-1',
        title: 'Thirty-Two Letters',
        category: 'Encoding',
        points: 250,
        brief: `Capital letters and digits, and the digits stop at 7. There is padding on the end, but more of it than you are used to.

That alphabet is a different size from the one you know.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Iron Meridian -- manifest header, airship VII',
            body: 'INQXEZ3PEBWWC3TJMZSXG5BMEBQWS4TTNBUXAICWJFETUIDBMV2GQZLSFVRW62LMFQQG42LHNB2HG2DBMRSSYIDBNZSCA33OMUQHAYLTONSW4Z3FOIQHI4TBOZSWY3DJNZTSAYLTEBRWC4THN4XCAQ3POVXHIZLSONUWO3RAIJJECU2TPN2GQ2LSOR4V65DXN5PWYZLUORSXE427N5TF6YTSMFZXG7I=',
            note: 'No lowercase. No 0, 1, 8 or 9 anywhere in it.',
          },
        ],
        hintCount: 3,
        lesson: `**Base32** packs 5 bits per character against Base64's 6, using A-Z and 2-7. It drops 0, 1, 8 and 9 because they are too easily confused with O, I, B and g when a human has to read them aloud or copy them off a screen.

You will meet it in TOTP seeds, onion addresses, DNS-based exfiltration and anywhere bytes have to survive being spoken down a phone line. The tell is the character set plus padding that runs to more than two "=".`,
        tools: ['base32'],
      },
      {
        id: 'm1-2',
        title: 'The Key That Repeats',
        category: 'Classical Crypto',
        points: 250,
        brief: `Hex again, and XOR again -- but every 256-key you try produces nonsense partway through and then recovers.

That is what a key shorter than its message looks like. The company signs its wire traffic with its own name.`,
        evidence: [
          {
            kind: 'document',
            label: 'Dock Nine -- brass plate above the office door',
            body: `THE IRON MERIDIAN
Haulage, Bonded Storage, Aether Freight

"By the MERIDIAN we are measured, and by it we measure."`,
          },
          {
            kind: 'ciphertext',
            label: 'Intercepted wire -- Dock Nine to the Countinghouse',
            body: '09 2a 31 22 64 25 24 2a 2a 20 20 73 64 3d 29 2b 6d 35 33 3a 37 2c 2f 29 28 37 72 39 25 20 25 6e 24 2b 72 0e 31 20 2d 2a 6d 36 31 3b 2d 39 61 2f 23 21 72 3a 2d 2e 2f 2b 29 65 33 3a 64 0a 6f 6e 1b 24 3c 2c 6a 69 02 21 38 2b 26 2c 36 3a 28 29 23 65 10 1b 05 1a 12 35 39 2d 37 16 2f 2c 38 11 3f 20 22 2c 25 3d 32 11 24 31 21 2c 28 2f 3c',
            note: 'Single-byte XOR gets you readable fragments and nothing more.',
          },
        ],
        hintCount: 3,
        lesson: `Repeating-key XOR is a Vigenère cipher operating on bytes instead of letters. With the key known it is trivial; the interesting case is when it is not, which is where the Ghost track picks it up.

The lesson is that **key length is the whole weakness**. A key shorter than the message means the same keystream byte encrypts many plaintext bytes, and everything that is true of English letter frequency becomes true of each column independently.`,
        tools: ['rkxor', 'hex'],
      },
      {
        id: 'm1-3',
        title: 'Ink Between the Letters',
        category: 'Steganography',
        points: 250,
        brief: `The clerk swears the note is exactly as it was given to him and that he added nothing to it.

He is telling the truth. Somebody else added something, and it is sitting between every letter he wrote. Copy the note out and count what you get.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: "Clerk's note -- copied verbatim, including what he could not see",
            body:
              "C\u200Bl\u200Ce\u200Br\u200Bk\u200B'\u200Bs\u200C \u200Bn\u200Bo\u200Ct\u200Be\u200C,\u200B \u200Bf\u200Ci\u200Bl\u200Be\u200Cd\u200B \u200Bi\u200Bn\u200B \u200Bt\u200Cr\u200Bi\u200Cp\u200Bl\u200Ci\u200Bc\u200Ba\u200Ct\u200Ce\u200B:\u200C \u200Bt\u200Ch\u200Be\u200B \u200Cc\u200Ca\u200Br\u200Cg\u200Co\u200C \u200Cm\u200Ba\u200Cn\u200Ci\u200Bf\u200Ce\u200Cs\u200Bt\u200C \u200Bf\u200Bo\u200Cr\u200B \u200Ca\u200Ci\u200Br\u200Cs\u200Ch\u200Ci\u200Bp\u200B \u200CV\u200CI\u200BI\u200C \u200Bw\u200Ca\u200Cs\u200B \u200Cc\u200Bo\u200Cu\u200Cn\u200Ct\u200Ce\u200Cr\u200Bs\u200Ci\u200Cg\u200Bn\u200Be\u200Bd\u200C \u200Bt\u200Bw\u200Ci\u200Cc\u200Be\u200B \u200Co\u200Bv\u200Ce\u200Br\u200C,\u200C \u200Co\u200Bn\u200Cc\u200Be\u200B \u200Bi\u200Cn\u200C \u200Co\u200Br\u200Cd\u200Ci\u200Cn\u200Ba\u200Cr\u200Cy\u200B \u200Bi\u200Cn\u200Bk\u200C \u200Ba\u200Cn\u200Cd\u200B \u200Bo\u200Cn\u200Bc\u200Ce\u200B \u200Ca\u200Cg\u200Ba\u200Ci\u200Cn\u200C \u200Bi\u200Bn\u200C \u200Ba\u200C \u200Ch\u200Ca\u200Cn\u200Cd\u200B \u200Ct\u200Ch\u200Ca\u200Bt\u200C \u200BI\u200B \u200Bd\u200Co\u200C \u200Bn\u200Co\u200Bt\u200B \u200Br\u200Be\u200Cc\u200Co\u200Bg\u200Bn\u200Ci\u200Bs\u200Ce\u200B \u200Ca\u200Bn\u200Cd\u200C \u200Cd\u200Ci\u200Cd\u200B \u200Cn\u200Co\u200Bt\u200C \u200Cs\u200Be\u200Be\u200B \u200Ca\u200Cr\u200Br\u200Bi\u200Cv\u200Be\u200C.\u200B \u200CI\u200C \u200Ch\u200Ba\u200Cv\u200Be\u200B \u200Bc\u200Co\u200Cp\u200Ci\u200Be\u200Cd\u200B \u200Bt\u200Bh\u200Ce\u200C \u200Bw\u200Bh\u200Co\u200Bl\u200Ce\u200B \u200Co\u200Cf\u200C \u200Bi\u200Bt\u200C \u200Bo\u200Bu\u200Ct\u200C \u200Ce\u200Bx\u200Ba\u200Cc\u200Ct\u200Bl\u200Cy\u200C \u200Ca\u200Cs\u200C \u200Bi\u200Ct was given to me by the Dock Nine office, and I have added nothing at all to it, and I have taken nothing away from it either, whatever the Superintendent may say to you afterwards.",
            note: 'It looks like ordinary prose. It is longer than ordinary prose.',
          },
        ],
        hintCount: 3,
        lesson: `Those are **zero-width characters** -- U+200B and U+200C, real Unicode code points that render as nothing at all. Two of them make a binary alphabet, eight bits make a byte, and a paragraph of cover text carries a payload no reader will ever see.

This is how watermarking and leak-tracing works in practice: give each recipient the same document with an invisible serial number, and the copy that surfaces publicly names the person who leaked it. Strip zero-width characters from anything you accept from outside, and be aware that anything you paste may be carrying them.`,
        tools: ['zerowidth'],
      },
    ],
  },
]

export const GHOST_CASES: CaseFile[] = [
  {
    id: 'case-9',
    number: 'IX',
    title: 'The Drum Room',
    subtitle: 'In which the engine is asked what it remembers',
    epigraph:
      'The Iron Meridian does not compute. It remembers. Every message that ever passed the Hollow Gear is written somewhere in its drums.',
    brief: `No briefing this time. You know how this works.

Three artefacts came out of the drum room. Nobody is going to tell you what they are, because working that out is the job.`,
    challenges: [
      {
        id: 'x1-1',
        title: 'Hamming Finds the Length',
        category: 'Cryptanalysis',
        points: 450,
        brief: `One long hex artefact. XOR, obviously. Nobody wrote the key down.

Single-byte brute force fails. The key is longer than one byte and shorter than the message, and that is the entire opening.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Drum room -- artefact 1, transcribed as hex',
            body: '0526223b2b72252c3b22246f3d2d633b2f326f1b392c21671a2a20222726263961721f2b2a67322135222d2a6733203738632128236f31242e3f32232a696b2a3b67252a3f2e2e2d22253c7c6b06392225367226263c343628376b372726236f3a2a306f22212a206b332e34242a366b37272277073d272f20307708372a316f2e246f25392a3b33322172382c222220273739266f2e396f3b3f306f23253a3f386f6f26392b723f2b2a67333d2726306f26252a72252c3b673e21362e3b2a237b6f25232a2c2f7726216b37272277203c273a6f35322e21242d6f2639367224256f32246f3339266f3423263e27632e3377233b29263d332e617202256f3e383a7223223922773d372a276f333f26216b252e3577363d3e632726212a722931202c3221722a633d22272a333f2a212077243732632d3e7722372a303a353e21356b2b2030772e3e22282a673e3b216b30232e342a216b223d227b6f25232a2c2f7726216b37272277383a242f2a673829723f2b2a67363d2665630c282221262e313c2e30217209110e1404343a2a2e222e39280d2d2a21232410262326102b3221353f2b32',
            note: 'Long enough that statistics work on it.',
          },
        ],
        hintCount: 3,
        lesson: `The classic break, and still the best lesson in applied cryptanalysis.

**Find the key length** by taking pairs of adjacent blocks of candidate size and measuring their normalised Hamming distance -- the correct size scores lowest, because two blocks encrypted under the same keystream differ only by their plaintexts. **Then split the ciphertext into columns**, one per key byte, and break each column as an independent single-byte XOR using letter frequency.

A repeating key turns one hard problem into *n* easy ones. That is why modern stream ciphers never reuse keystream, and why key length alone is never the thing that makes a cipher strong.`,
        tools: ['keysize', 'rkxor', 'hex'],
      },
      {
        id: 'x1-2',
        title: 'Small Primes',
        category: 'Cryptanalysis',
        points: 500,
        brief: `A public key and a row of numbers. The Meridian's engineers built their own key sizes, on the reasoning that a bigger modulus costs more brass.

Each block is three bytes of plaintext.`,
        evidence: [
          {
            kind: 'document',
            label: 'Drum room -- artefact 2, RSA housing plate',
            body: `Public key, struck on the drum housing:\n\n  n = 4291428937\n  e = 65537\n\nCiphertext blocks:\n\n  3739775969\n  4200589687\n  3013960708\n  148274312\n  3060796774\n  1210532151\n  183519140\n  3719624103\n  2698833847\n  2913734399\n  1868239600`,
          },
        ],
        hintCount: 3,
        lesson: `RSA's security rests entirely on **n being hard to factor**. This modulus is around 2^32, so trial division to its square root takes a browser a fraction of a second, and everything else follows mechanically: p and q give phi = (p-1)(q-1), phi and e give d as the modular inverse, and d decrypts every block.

Real keys are 2048 bits or more for exactly this reason. The failures you meet in the wild are not brute-forced moduli but the neighbouring mistakes: a shared prime between two keys, a tiny public exponent with no padding, or a nonce reused across signatures. The maths is rarely what breaks -- the parameters are.`,
        tools: ['rsa'],
      },
      {
        id: 'x2-2',
        title: 'Never Reuse the Stream',
        category: 'Cryptanalysis',
        points: 550,
        brief: `Two messages off the same wire, minutes apart. The operator was in a hurry and did not advance the drum between them.

You have no key and you are not going to get one. You do have a witness who remembers how the first message opened.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Artefact 3a -- first transmission',
            body: 'a7e86873db82dee99dd60a92e0652dc7e12abfe5c74b46be02386cf373439e30e7a4bd1737befd8e2e12be15feeb89fcee4ce197e1e49cc9c6',
          },
          {
            kind: 'ciphertext',
            label: 'Artefact 3b -- second transmission, same drum position',
            body: 'b0ef783dc386c1ea879103dda6652a93b523aee5c75844bd022b6df83e17b4078684860529a8ab8a2e28ec11e7ea89c2fe5da4a4fdf18ac9c3',
          },
          {
            kind: 'document',
            label: 'Wire clerk\'s statement',
            body: `He swears the first message began, word for word:

  "the lamps go out at dawn"

He never saw the second one at all.`,
          },
        ],
        hintCount: 3,
        lesson: `This is a **two-time pad**, and it is not a cipher at all any more.

XOR the two ciphertexts together and the keystream cancels: C1 XOR C2 = P1 XOR P2. The key never enters into it. Any guess at one plaintext immediately yields the same stretch of the other, which is why the technique is called crib dragging -- you slide a likely phrase along until what falls out the other side is English.

This is why every stream cipher and every AES-CTR or GCM deployment treats the nonce as sacred. Reusing an IV is not a weakening of the encryption; it is the removal of it. It has broken WEP, Microsoft PPTP, and more bespoke protocols than anyone has counted.`,
        tools: ['rkxor', 'hex'],
      },
    ],
  },
]
