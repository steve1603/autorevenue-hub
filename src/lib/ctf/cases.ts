/**
 * The Brasshaven Files -- case data.
 *
 * This module ships to the browser, so it holds only what a player is allowed
 * to see before solving anything: narrative set-up, evidence, and scoring
 * metadata. Everything that could give a flag away lives server-side instead,
 * because the leaderboard is only trustworthy if the browser never knows the
 * answers:
 *
 *   - answer hashes       -> src/lib/ctf/server/answers.ts
 *   - hint text           -> src/lib/ctf/server/hints.ts
 *   - post-solve debriefs -> src/lib/ctf/server/debriefs.ts
 *   - terminal hosts      -> src/lib/ctf/server/hosts.ts
 *
 * All are marked `server-only`, so the build fails if any of them is ever
 * imported into a client component.
 */

export type ToolId =
  | 'base64'
  | 'hex'
  | 'binary'
  | 'caesar'
  | 'vigenere'
  | 'morse'
  | 'xor'
  | 'sha256'

export type Evidence =
  | { kind: 'document'; label: string; body: string }
  | { kind: 'ciphertext'; label: string; body: string; note?: string }
  /**
   * The only evidence kind that still carries its flag in the bundle, and
   * deliberately so: this challenge *is* "read the page source", so the
   * countersign has to be in the DOM for the puzzle to exist at all.
   */
  | { kind: 'source'; label: string; body: string; secret: string }
  /** Filesystem and headers live in src/lib/ctf/server/hosts.ts. */
  | { kind: 'terminal'; label: string; host: string }
  /** The bypass is evaluated by /api/ctf/vault, which holds the countersign. */
  | { kind: 'login'; label: string; host: string }
  | { kind: 'wordlist'; label: string; target: string; names: string[]; note: string }

export interface Challenge {
  id: string
  title: string
  category: string
  points: number
  /** Noir set-up shown above the evidence. */
  brief: string
  evidence: Evidence[]
  /** How many hints exist. The text itself is fetched from the server on demand. */
  hintCount: number
  /** The real-world security lesson -- the reason any of this matters. */
  lesson: string
  tools: ToolId[]
}

export interface CaseFile {
  id: string
  number: string
  title: string
  subtitle: string
  epigraph: string
  brief: string
  challenges: Challenge[]
}

export const FLAG_FORMAT = 'BRASS{...}'

export const CASES: CaseFile[] = [
  /* ================================================================ CASE 1 */
  {
    id: 'case-1',
    number: 'I',
    title: 'The Ledger of Ashes',
    subtitle: 'In which a fire is not an accident',
    epigraph:
      'The rain came down like it had a grudge, and the gaslamps did what they could about it, which was nothing.',
    brief: `Nine days ago the Ashgrave & Vane Detective Agency lost its senior partner. Cordelia Vane walked out into the fog on a Tuesday and never walked back in. She left you the office, the overdue rent, and a filing cabinet that somebody tried to set on fire.

The fire failed. Whoever set it did not know that the Guild prints its ledgers on aether-treated paper, and aether-treated paper does not burn -- it only chars around the edges and keeps its secrets.

You are the last detective on the payroll. The payroll is you. Start reading.`,
    challenges: [
      {
        id: 'c1-1',
        title: 'The Charred Ledger',
        category: 'Encoding',
        points: 100,
        brief: `The top page of the ledger is not written in any hand you recognise. It is a block of letters and numbers, ending in a pair of equals signs that hang off the end like a man off a ledge.

The Guild clerks encode their entries so a thief with a lantern and thirty seconds cannot read them. It is not a lock. It is a curtain. Pull it back.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Ledger page 44 -- recovered from the ash',
            body: 'TGVkZ2VyIGVudHJ5IDQ0OiB0aHJlZSBjcmF0ZXMgb2YgYWV0aGVyLWNvaWwsIHNpZ25lZCBmb3IgYnkgYSBtYW4gd2l0aCBubyBzaGFkb3cuIEhlIHBhaWQgaW4gR3VpbGQgc2NyaXAuIFRoZSBjbGVyaydzIGNvdW50ZXJzaWduIHdhcyBCUkFTU3thc2hfYW5kX2xlZGdlcl9saW5lc30=',
            note: 'Letters, digits, and those two equals signs at the end.',
          },
        ],
        hintCount: 3,
        lesson: `Base64 is **encoding**, not encryption. It exists to move binary data through channels that only accept text -- email attachments, JSON payloads, cookies, JWTs. The "=" padding at the end is the giveaway, and any decoder in the world will undo it instantly.

The security lesson is what people do with it: teams routinely Base64 a password or an API key and believe they have protected it. They have not. They have written it in a slightly larger font.`,
        tools: ['base64'],
      },
      {
        id: 'c1-2',
        title: 'Tally Marks of the Foundry',
        category: 'Encoding',
        points: 100,
        brief: `Behind the ledger, a foundry tally sheet. The Ironhollow works run their counting machines on punched tape, and a clerk with more spite than sense has copied the tape out by hand.

Ones and zeroes, in tidy groups of eight. Every group of eight is one letter. That is the whole trick.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Ironhollow Foundry -- punched tape transcription',
            body: '01001011 01000101 01011001 00111010 00100000 01000010 01010010 01000001 01010011 01010011 01111011 01101001 01110010 01101111 01101110 01011111 01110100 01100001 01101100 01101100 01111001 01011111 01100101 01101001 01100111 01101000 01110100 01011111 01100010 01101001 01110100 01110011 01111101',
            note: 'Count them. Eight to a group, every time.',
          },
        ],
        hintCount: 3,
        lesson: `Everything a computer stores is bytes; text is just an agreement about what those bytes mean. ASCII and UTF-8 are that agreement.

Recognising raw binary, hex, and Base64 on sight is the single most useful reflex in CTF work. Half of "encrypted" data you will ever meet is not encrypted at all -- it is one of these three wearing a hat.`,
        tools: ['binary'],
      },
      {
        id: 'c1-3',
        title: "The Apothecary's Receipt",
        category: 'Encoding',
        points: 100,
        brief: `Tucked in the ledger's spine, a receipt from an apothecary on Grieve Street. Somebody has recopied it in pairs of characters -- digits and the letters a through f, never past f.

That range is not a coincidence. Sixteen symbols. Count them on your fingers, if you have sixteen fingers.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Grieve Street Apothecary -- receipt, recopied',
            body: '41 70 6f 74 68 65 63 61 72 79 20 72 65 63 65 69 70 74 20 2d 2d 20 6f 6e 65 20 64 72 61 6d 20 6f 66 20 6e 69 67 68 74 73 68 61 64 65 2e 20 43 6f 75 6e 74 65 72 73 69 67 6e 20 42 52 41 53 53 7b 73 69 78 74 65 65 6e 5f 66 69 6e 67 65 72 73 7d',
            note: 'Nothing later in the alphabet than "f" appears anywhere.',
          },
        ],
        hintCount: 3,
        lesson: `Hex is how humans read bytes. You will see it in memory dumps, packet captures, file signatures, and hash digests for the rest of your career.

Learn the file-header magic bytes and you can identify any file with your eyes: **50 4b** is a ZIP, **89 50 4e 47** is a PNG, **7f 45 4c 46** is a Linux binary. When a challenge hands you a file with the wrong extension, this is how you catch it.`,
        tools: ['hex'],
      },
    ],
  },

  /* ================================================================ CASE 2 */
  {
    id: 'case-2',
    number: 'II',
    title: 'The Pneumatic Post',
    subtitle: 'In which the city talks behind its own back',
    epigraph:
      'Every building in Brasshaven is plumbed for messages. Brass tubes in the walls, whispering day and night. People forget the walls can be opened.',
    brief: `The gear-with-a-hole stamp belongs to a shipping concern: the Hollow Gear Consortium, offices on Vane Quay, which is a coincidence you do not believe in for a second.

They publish a public directory through the pneumatic post -- the city's message network. Any citizen with a terminal can query it. Which means any citizen with a terminal can query the things they forgot to stop publishing.

This is reconnaissance. You are not breaking anything. You are reading what they left lying in the street.`,
    challenges: [
      {
        id: 'c2-1',
        title: 'Ink Beneath the Paper',
        category: 'Web Recon',
        points: 150,
        brief: `The Consortium's public notice. Printed cheap, posted on every board from here to the docks.

The typesetters at the Brasshaven print houses leave notes for each other in the margins of the plate -- instructions, corrections, things nobody bothers to scrape off before the run. The notes do not print in the ink. They are still on the plate.

Look *underneath* the notice, not at it.`,
        evidence: [
          {
            kind: 'source',
            label: 'Public notice -- Hollow Gear Consortium (mounted on the evidence board)',
            body: `HOLLOW GEAR CONSORTIUM
Shipping and Aether Haulage -- Vane Quay, Dock Nine

NOTICE TO THE PUBLIC: The Consortium regrets the disruption
to the Quay Road and thanks the citizenry for its patience.
All enquiries to the Clerk of Works.

By order, I. ROOK, Superintendent.`,
            secret: 'BRASS{the_margins_talk}',
          },
        ],
        hintCount: 3,
        lesson: `View-source and developer tools are the first thing to try on any web challenge, and the habit pays off outside of games too.

Developers leave real things in HTML comments: staging URLs, test credentials, "TODO: remove before launch", the name of an internal server. Everything sent to the browser belongs to the visitor -- comments, hidden form fields, disabled buttons, and the JavaScript that "hides" a page. None of it is a security boundary.`,
        tools: [],
      },
      {
        id: 'c2-2',
        title: 'The Forbidden Corridor',
        category: 'Web Recon',
        points: 150,
        brief: `You have a terminal on the public post, and the Consortium has a public directory.

Every well-run message host publishes a courtesy file telling automatic indexing engines which corridors to stay out of. It is a polite request. It is not a lock. And a list of the places somebody does not want indexed is, for a detective, a rather useful list.

Type \`help\` if you have never used a terminal. Nobody is watching.`,
        evidence: [
          {
            kind: 'terminal',
            label: 'Pneumatic Post Terminal -- public directory, Hollow Gear Consortium',
            host: 'tube.hollowgear.bh',
          },
        ],
        hintCount: 3,
        lesson: `\`robots.txt\` asks well-behaved crawlers not to index certain paths. It has no enforcement whatsoever -- and by design it is a **public list of the paths somebody would rather you not look at**.

It is the first file to check on any web target, alongside \`/.git/\`, \`/.env\`, \`/sitemap.xml\`, and \`/admin\`. The real lesson for defenders: hiding a path is not protecting it. If a page needs protection, it needs authentication and authorisation checks on the server -- not an absence of links.`,
        tools: [],
      },
      {
        id: 'c2-3',
        title: "The Doorman's Token",
        category: 'Web Recon',
        points: 150,
        brief: `The vault corridor answers now, but it answers with nothing -- a blank page and a closed door.

Every pneumatic message carries a header block: the routing marks, the timestamps, the little administrative scribbles the tube system attaches before the message body. Nobody reads the header block. Nobody ever reads the header block.

Ask the door for its headers and don't bother with the body.`,
        evidence: [
          {
            kind: 'terminal',
            label: 'Pneumatic Post Terminal -- vault corridor',
            host: 'vault.hollowgear.bh',
          },
        ],
        hintCount: 3,
        lesson: `HTTP headers carry an enormous amount of information that nobody looks at: server versions, framework names, debug flags, session cookies, and -- more often than anyone would like -- tokens.

\`curl -I\` and your browser's Network tab are how you read them. For defenders: strip \`X-Powered-By\` and version banners, never put secrets in custom headers that reach the client, and set \`HttpOnly\` and \`Secure\` on session cookies so scripts cannot read them.`,
        tools: ['base64'],
      },
    ],
  },

  /* ================================================================ CASE 3 */
  {
    id: 'case-3',
    number: 'III',
    title: "The Clockmaker's Confession",
    subtitle: 'In which the alphabet is put on a wheel and turned',
    epigraph:
      'A cipher is a promise between two people that a third will be left out in the rain. Most promises leak.',
    brief: `The manifest room drawers are full, and they are full of ciphertext.

The Hollow Gear does not trust the pneumatic post -- and it is right not to, since you are reading its post. So it encrypts. Badly, and with the enthusiasm of people who have read one book about it.

These are classical ciphers: alphabet tricks, invented centuries before anyone had a machine to break them. A machine is exactly what you have. It is on your desk. It is called the Difference Engine, and it never gets tired.`,
    challenges: [
      {
        id: 'c3-1',
        title: 'The Gaslamp Rotation',
        category: 'Classical Crypto',
        points: 200,
        brief: `First drawer. A note in what looks like a foreign language and is not one.

Look at the shape of it: word lengths ordinary, letter patterns ordinary, one word wearing braces exactly where a countersign ought to be. Nothing has been hidden. Everything has been *moved*, each letter walked the same number of steps down the alphabet.

Find out how many steps.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Drawer 1 -- note, unsigned',
            body: 'Gur ynzcyvtugre jnyxf gur Inapr Ebnq ng zvqavtug. Ur pneevrf gur pbhagrefvta OENFF{guvegrra_gheaf_bs_gur_ynzc} sbyqrq va uvf tybir.',
            note: 'Note that "OENFF" has the same letter pattern as "BRASS".',
          },
        ],
        hintCount: 3,
        lesson: `The Caesar cipher shifts every letter by a fixed amount. ROT13 -- shift 13 -- is the famous one, and it is its own inverse: apply it twice and you are back where you started.

The lesson is about **keyspace**. A Caesar cipher has 25 possible keys, so trying all of them takes no time at all. A cipher is only as strong as the number of keys an attacker must search. This is why modern key sizes are astronomically large: not because the maths is fancier, but because brute force must remain impossible rather than merely tedious.`,
        tools: ['caesar'],
      },
      {
        id: 'c3-2',
        title: 'Dots and Dashes on the Wire',
        category: 'Classical Crypto',
        points: 200,
        brief: `Second drawer. Not a note -- a telegraph transcription, taken off the Ironhollow wire by a clerk who wrote down the sound and not the sense.

Dots, dashes, spaces between letters, slashes between words. This is not a cipher at all. It is an alphabet for a wire that can only be on or off.

The message names a key you will need in a moment. Remember it.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Drawer 2 -- Ironhollow wire, intercepted transcription',
            body: '- .... . / -.- . -.-- / .. ... / - . .-.. . --. .-. .- .--. .... / --. .... --- ... -',
            note: 'Spaces separate letters. The slashes separate words.',
          },
        ],
        hintCount: 3,
        lesson: `Morse is an encoding, not a cipher -- no key, no secret, just a way to carry letters over a channel with two states.

CTFs love it because it hides in plain sight: in audio files, in blinking lights in a video, in a pattern of long and short pauses, in a string of dots and dashes that looks like line noise. When you see exactly two repeating symbols, think Morse. When you see exactly two symbols and groups of eight, think binary.`,
        tools: ['morse'],
      },
      {
        id: 'c3-3',
        title: 'The Vigenère Waltz',
        category: 'Classical Crypto',
        points: 200,
        brief: `Third drawer, and this one fights back.

You try all 25 shifts and get 25 kinds of nonsense. The reason is that the shift *changes* as it goes -- a different step for each letter, cycling through a keyword over and over. A Caesar cipher dancing a waltz.

Without the keyword you would be here all night. Fortunately the Consortium engraves its keyword on its own letterhead, because of course it does.`,
        evidence: [
          {
            kind: 'document',
            label: 'Drawer 3 -- letterhead, embossed',
            body: `HOLLOW GEAR CONSORTIUM
Dock Nine, Vane Quay

House motto, struck in brass above the door:
    "COGWHEEL turns, and the city turns with it."`,
          },
          {
            kind: 'ciphertext',
            label: 'Drawer 3 -- sealed instruction',
            body: 'Oskp ti fppsgpo xlp ezuyr ex Ttct Dvppzy. Hna jsyyvsxopkr tu PXWZW{alnhf km xlp dfgoz oij} cbj jv sxsgf.',
            note: 'The braces survived. Only the letters were touched.',
          },
        ],
        hintCount: 3,
        lesson: `Vigenère resisted casual codebreaking for three hundred years, and it still falls to a known keyword in one second.

The general lesson is **key management**. The algorithm was never the weak part -- the weak part was that the key had to be shared, remembered, written down, and eventually engraved over a door. Modern breaches follow the identical pattern: strong crypto, key committed to a public git repository.`,
        tools: ['vigenere', 'caesar'],
      },
    ],
  },

  /* ================================================================ CASE 4 */
  {
    id: 'case-4',
    number: 'IV',
    title: 'The Vault at Iron Hollow',
    subtitle: 'In which a door is opened by asking it the wrong question',
    epigraph:
      'Under the foundry the air is hot enough to bend, and the machines talk to each other all night in a language of clicks. They are not discreet.',
    brief: `Eight locks on the pressure vault, and you have until the shift bell.

Below the foundry floor the Consortium keeps a difference engine of its own -- a keeper's register, a cipher wheel, and a door that takes a phrase instead of a key. Three obstacles, three quite different kinds of failure.

This is where you stop reading what people left lying about and start taking things apart.`,
    challenges: [
      {
        id: 'c4-1',
        title: "The Locksmith's Fingerprint",
        category: 'Hashing',
        points: 250,
        brief: `The keeper's register does not store names. It stores fingerprints -- a fixed-length smear of hex computed from a name, one-way, no undoing it.

The eighth key was signed out by whoever owns this fingerprint. You cannot reverse it. Nobody can reverse it.

But you have the guild roll of every keeper with vault access, all twelve of them. Take a fingerprint of each name and see which one matches. That is not reversing the hash. That is *guessing well*.`,
        evidence: [
          {
            kind: 'wordlist',
            label: 'Iron Hollow keepers -- guild roll (vault access)',
            target: '9cc607eef2a8f340ce82164c71b909ba36e181d579a83b0b21331155b523115a',
            note: 'The register stores SHA-256 of the keeper\'s name, lowercase, exactly as written on the roll.',
            names: [
              'mortimer krell',
              'adelaide finch',
              'josiah vane',
              'perpetua stone',
              'barnaby glass',
              'ignatius rook',
              'wilhelmina cog',
              'thaddeus ash',
              'octavia brine',
              'silas grimm',
              'evangeline dey',
              'horace pike',
            ],
          },
        ],
        hintCount: 3,
        lesson: `Hashes are one-way by design, which is why passwords should be stored as hashes rather than as text. Attackers do not reverse them -- they **guess**: hash a huge list of likely inputs and look for a match. That is what "password cracking" is, in its entirety.

This is why defenders use a slow, salted password hash (bcrypt, scrypt, Argon2) rather than raw SHA-256. A **salt** -- a unique random value per user -- means an attacker must attack each password separately instead of testing one guess against the whole database at once. Slowness makes billions of guesses expensive. Plain SHA-256 is fast, which for passwords is a defect, not a feature.`,
        tools: ['sha256'],
      },
      {
        id: 'c4-2',
        title: 'The Cipher Wheel',
        category: 'Classical Crypto',
        points: 250,
        brief: `Bolted to the vault housing is a brass wheel of 256 positions, and beside it a strip of punched hex.

The wheel combines each byte of the message with a single secret byte, using an operation the engineers call *exclusive or*: it flips the bits that the key says to flip, and applying it a second time flips them back.

One byte of key. 256 positions. You have a machine and you have all night, though in fact you will need about a second.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'Vault housing -- punched hex strip',
            body: '7c 4b 5f 46 5e 0a 5a 42 58 4b 59 4f 10 0a 68 78 6b 79 79 51 4f 52 49 46 5f 59 43 5c 4f 75 45 58 75 4f 52 49 46 5f 59 43 5c 4f 75 46 43 4f 59 57',
            note: 'Hex again -- but decoding it as text gives you nothing. Something has been done to these bytes.',
          },
        ],
        hintCount: 3,
        lesson: `XOR is the atom of symmetric cryptography: fast, and perfectly reversible with the same key. Real ciphers use it constantly -- but with key material as long as the message and never reused.

Single-byte XOR fails because the keyspace is 256. Repeating-key XOR fails for a subtler reason: the key repeats, so patterns leak through, and statistical analysis of English letter frequency peels it apart. XOR is only unbreakable in one situation -- a truly random key, as long as the message, never used twice. That is a one-time pad, and its impracticality is precisely the key-management problem all of cryptography exists to solve.`,
        tools: ['xor', 'hex'],
      },
      {
        id: 'c4-3',
        title: 'The Door That Asks Questions',
        category: 'Exploitation',
        points: 250,
        brief: `The eighth lock is a talking door. It asks for a keeper's name and a passphrase, and it checks them against the register by *building a sentence* out of whatever you type and reading that sentence to the engine below.

That is the flaw, and it is the same flaw that has emptied more real databases than every other bug combined. The door cannot tell the difference between the words you typed and the words it wrote around them.

So do not guess the passphrase. Change the question.`,
        evidence: [
          {
            kind: 'login',
            label: 'Iron Hollow vault -- keeper challenge',
            host: 'vault.ironhollow.bh',
          },
        ],
        hintCount: 3,
        lesson: `That is **SQL injection**. The door concatenated your input into a query, so your input became part of the query's grammar rather than its data. \`' OR '1'='1\` closes the string and appends a condition that is always true.

The fix is not to filter apostrophes -- filters leak. The fix is **parameterised queries** (prepared statements), where the database receives the query structure and the values through separate channels and can never confuse one for the other. Add least-privilege database accounts and error messages that do not narrate the query, and this entire class of attack closes.

A word on ethics, since you now know how: this door is a simulation. Doing this to a system you do not own or have written permission to test is a crime in most of the world. Keep it in the CTF.`,
        tools: [],
      },
    ],
  },

  /* ================================================================ CASE 5 */
  {
    id: 'case-5',
    number: 'V',
    title: 'The Hollow Gear',
    subtitle: 'In which the fog lifts, briefly',
    epigraph:
      'Everybody in this city is running from something. The trick of the job is working out whether they are running from you, or towards something worse.',
    brief: `The paper in the hat is not a letter. It is two documents, and Cordelia wrapped them the way she wrapped everything: in layers, because she assumed she would be read.

She was right. She was read. That is why there is a rope on the floor.

Finish it.`,
    challenges: [
      {
        id: 'c5-1',
        title: 'Layers Upon Layers',
        category: 'Multi-layer',
        points: 350,
        brief: `The first document is Base64 -- you know that shape by now. But decoding it gives you something that still is not English, and the letter patterns are the ones you were staring at in Case III.

Cordelia never encoded anything once. Peel it, then peel it again.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: "In the hat -- first document",
            body: 'Wm5hdnNyZmcgYnMgZ3VyIFVieXliaiBUcm5lOiBhdmFyIG52ZWZ1dmNmLCBiYXIgY2hlY2Jmci4gUGJoYWdyZWZ2dGEgT0VORkZ7eW5scmVmX2hjYmFfeW5scmVmfQ==',
            note: 'Two equals signs on the end. Start there.',
          },
        ],
        hintCount: 3,
        lesson: `Real challenges stack transformations, and the skill being tested is **recognition**: look at the output of each step and ask what it looks like now.

Trailing "=" means Base64. Only 0-9 and a-f means hex. Only two symbols in groups of eight means binary. English word-lengths with wrong letters means a substitution cipher. Work outside in, one layer at a time, and never assume the first decode is the last one.`,
        tools: ['base64', 'caesar'],
      },
      {
        id: 'c5-2',
        title: "Cordelia's Last Cipher",
        category: 'Multi-layer',
        points: 500,
        brief: `The second document is a Vigenère, and Cordelia did not leave the key on a letterhead. She was better than that.

She left it on a wire, in dots and dashes, in a drawer she knew you would open before this one. Two words, capitals, no spaces between them when you feed them to the wheel.

She was always three steps ahead. She just was not fast enough.`,
        evidence: [
          {
            kind: 'ciphertext',
            label: 'In the hat -- second document, in Cordelia\'s hand',
            body: 'Vschkcip okys. Ay rsf vkrd iooz W sf tpciguy piuhfv. Mai weyk cdbtasjlbky my SRPZY{avw etqaw mf oja ga rspg} ffvt khxz.',
            note: 'The key is not written anywhere in this document. You already have it.',
          },
        ],
        hintCount: 3,
        lesson: `You have just used every core skill in beginner CTF work: encoding recognition, web reconnaissance, classical cryptanalysis, hash cracking, injection, and multi-layer decoding.

Where to go next, for real: **picoCTF** (built for beginners, always open), **OverTheWire Bandit** (Linux and shell fundamentals), **TryHackMe** and **Hack The Box** starting tracks, and **CryptoHack** if the cipher work was the part you enjoyed.

The one rule that carries over from this game to everything after it: only ever test systems you own or have explicit written permission to test. The skills are identical; the authorisation is the entire difference between a career and a conviction.`,
        tools: ['vigenere', 'base64'],
      },
    ],
  },
]

export interface Rank {
  title: string
  at: number
}

export const RANKS: Rank[] = [
  { title: 'Apprentice Sleuth', at: 0 },
  { title: 'Constable of the Cog', at: 300 },
  { title: 'Inspector, Third Gear', at: 750 },
  { title: 'Inspector, First Gear', at: 1400 },
  { title: 'Chief Cipher Detective', at: 2200 },
  { title: 'Ghost of Brasshaven', at: 2950 },
]

export const TOTAL_POINTS = CASES.reduce(
  (sum, c) => sum + c.challenges.reduce((s, ch) => s + ch.points, 0),
  0,
)

export const ALL_CHALLENGES = CASES.flatMap((c) => c.challenges)

export function rankFor(points: number): Rank {
  return [...RANKS].reverse().find((r) => points >= r.at) ?? RANKS[0]
}

/** Each hint costs a fifth of the challenge's value, and never more than three fifths. */
export function pointsFor(challenge: Challenge, hintsUsed: number): number {
  return Math.round(challenge.points * Math.max(0.4, 1 - 0.2 * hintsUsed))
}
