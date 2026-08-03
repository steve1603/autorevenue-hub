# The Brasshaven Files

A beginner capture-the-flag adventure game, styled as steampunk noir detective fiction.
Route: **`/ctf`**.

You play the last detective at the Ashgrave & Vane agency in the gaslamp city of
Brasshaven, working five cases to find out what happened to your missing partner.
Each case is a set of security challenges, and every challenge teaches one real
technique and then explains it plainly once you have solved it.

## Design goals

- **No prerequisites.** Everything solvable at the desk: the in-game *Difference
  Engine* workbench provides Base64, hex, binary, Caesar (with a full 25-shift
  brute-force table), Vigenère, Morse, single-byte XOR brute force, and SHA-256.
  No external decoder sites, no command-line tools to install.
- **Teach, don't just test.** Every solved challenge shows a "Field craft" panel
  explaining what the technique actually is, where it appears in real systems,
  and what defenders should do about it.
- **Hints with a price, not a wall.** Three escalating hints per challenge; the
  last one is close to a walkthrough. Each hint costs a fifth of the case fee,
  floored at 40% — a stuck player always finishes.
- **Ethics stated in the game, not in a footnote.** The SQL injection debrief and
  both end screens say plainly that these skills belong on systems you own or are
  authorised to test.

## The cases

| Case | Title | Teaches |
|------|-------|---------|
| I | The Ledger of Ashes | Base64, binary, hex — encoding vs. encryption |
| II | The Pneumatic Post | HTML comments, `robots.txt`, HTTP response headers |
| III | The Clockmaker's Confession | Caesar/ROT13, Morse, Vigenère; keyspace and key management |
| IV | The Vault at Iron Hollow | Hash cracking with a wordlist, single-byte XOR, SQL injection |
| V | The Hollow Gear | Layered encodings, and a Vigenère whose key was planted in Case III |

14 challenges, 2,950 points, six ranks from *Apprentice Sleuth* to *Ghost of Brasshaven*.
Cases unlock in order — a case opens when the previous one is fully closed.

## The leaderboard and its anti-cheat design

Players sign the register with a handle and appear on `/ctf/leaderboard`, ranked
by points. Any number of people can play at once from different machines --
each browser holds its own signed session.

The leaderboard is only worth having if scores are hard to fake, and a CTF
audience is exactly the crowd that will try. The rule the design follows is:
**the browser never learns anything it could use to skip the work, and never
tells the server what a solve was worth.**

What that means concretely:

| Measure | Effect |
|---|---|
| Answer hashes are `server-only` | The browser cannot check a flag itself, so it cannot know one without solving |
| Hint text served by `/api/ctf/hint` | Reading a hint is recorded, so the point penalty cannot be dodged |
| Debriefs served on solve | Case III's debrief names TELEGRAPH GHOST — both its own flag and the finale's key |
| Terminal filesystem is server-side | `cat robots.txt` really queries the host; the flag isn't in the bundle to grep |
| Vault injection evaluated server-side | The countersign is released only to a request that actually performed the bypass |
| Score computed from recorded solves | No endpoint accepts a score; the client cannot submit one |
| `(player_id, challenge_id)` primary key | A replayed submission cannot bank points twice |
| HMAC-signed, httpOnly session cookie | A player cannot forge another's identity, and page scripts cannot read the cookie |
| Fixed-window rate limit (30/min/challenge) | Guessing at flags is never cheap |
| Supabase RLS enabled with no policies | The public anon key cannot touch the tables; only the server's service role can |

### What this does *not* stop

Stated plainly, because a security feature you have overestimated is worse than
one you have not built:

- **Case II-1 ("Ink Beneath the Paper") still has its flag in the page.** It has
  to: the challenge *is* reading the page source. Finding it in the bundle is
  the intended solution.
- **Case IV-1's wordlist is public**, as it must be — hashing the twelve names is
  the exercise. A player could guess among twelve instead of hashing.
- **Sharing answers between people.** No technical measure fixes this; it is a
  social problem. The board shows hint counts and elapsed time, which makes an
  implausible run visible.
- **Scripting the decoders.** The ciphertexts must reach the player to be
  solvable. Someone who automates the decoding has, arguably, done the work.

### Setup

Without a database the game still runs — scores are held in memory, and both the
game and the board say so plainly. For real use:

1. Run `supabase/migrations/0001_ctf_leaderboard.sql` in your Supabase SQL editor.
2. Set these environment variables on the deployment:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-side only, never NEXT_PUBLIC_
CTF_SESSION_SECRET=<32+ random characters>
```

If `CTF_SESSION_SECRET` is missing in production the leaderboard switches
itself off and both screens say so: signing the register returns a clean 503,
the sign-in form is replaced by an explanation, and the game stays fully
playable with flags still checked. The server deliberately does *not* fall back
to a generated secret — every serverless instance would sign differently, so a
player would be logged out at random and their score would scatter across
phantom identities. A closed board that admits it beats a board that quietly
loses people.

## Silhouette scenes

Every case and every puzzle opens with an animated gaslamp-noir plate: the
burning filing cabinet, the lamplighter walking his round, the telegraph wire
sparking, the eight-lock vault, nine airships leaving at dawn.

They are inline SVG built from shared primitives (skyline, lamp post, detective,
airship, gear, fog, rain), animated with CSS transforms and opacity only. No
image assets, no animation loop, no client JavaScript -- the component is
server-rendered and never enters the bundle. Motion is decoration, never
information: under `prefers-reduced-motion` all animation stops and each scene
still reads as a composed still.

### Three SVG traps worth knowing about

All three were caught by rendering a contact sheet and looking at it, not by
the type checker:

1. **A CSS `transform` replaces an SVG `transform` attribute.** Putting an
   animated class straight onto `<g transform="translate(600 84) scale(0.72)">`
   discards the position *and* the scale, dumping a full-size sprite at the
   origin. Animated classes always go on a nested `<g>`.
2. **Keyframes that set `opacity` beat an `opacity` attribute** on the same
   element. Every soft 0.06-0.16 glow was being forced to ~1 and blowing out the
   plate. The class goes on a wrapper so the two values multiply.
3. **Percentage translations resolve against the element's own bounding box**,
   not the viewBox, so a figure told to walk 108% moved about its own width.
   Use viewBox units with `transform-box: view-box`; use
   `transform-box: fill-box` with keyword origins for anything that rotates.

## Sound

A synthesised gaslamp score, generated with the Web Audio API. Like the scenes
there are no assets: no audio files to ship, no requests to fail, no licences to
track. The whole soundtrack is a few kilobytes of code.

**The bed** is a slow drone on D with a fifth above it, a whisper of filtered
noise for rain, and a sparse melody -- one note every 3-9 seconds drawn from D
natural minor, weighted towards the low end so it reads as atmosphere rather than
a tune anyone has to listen to. The ambience shifts with the setting: interiors
(the pneumatic post, the foundry) muffle the low-pass, and Case V opens it out
into dawn.

**Cues** mark the moments that matter -- a rising minor triad when a countersign
is accepted, a dull dropping thud when it is refused, paper and a brass tap for a
hint, a telegraph click on every terminal command, a heavy clunk and ringing
metal when the eighth lock retracts, a distant bell when a new case opens.

### Two things it deliberately does

- **Nothing plays until asked.** Sound is off by default and the `AudioContext`
  is not even constructed until the toggle is pressed. Browsers block audio
  outside a user gesture anyway, but unannounced noise is obnoxious regardless.
  The preference is stored, and a returning player who had it on gets the score
  back on their first click rather than being silently ignored.
- **Cues duck the music.** Measured without ducking, the solve chord peaked at
  0.127 against a 0.119 bed -- it registered as slightly more noise instead of as
  a moment. The music now steps back to 35% for the length of a cue, and the
  chord lands at 0.143 against a 0.091 bed.

Levels were verified by splicing an analyser in front of the destination and
measuring real output: the bed sits at ~0.03 RMS, cues peak around 0.14, and
nothing clips.

## How it is put together

```
src/app/ctf/
  page.tsx        game shell: title card, case board, case view, score, ranks
  layout.tsx      route metadata
  ctf.css         gaslamp theme, scoped to .ctf-root (no image assets)
  scenes.css      silhouette scene keyframes
src/lib/ctf/
  audio.ts        synthesised score and effects (Web Audio, no assets)
  cases.ts        narrative and evidence -- the client-safe half only
  ciphers.ts      pure encode/decode helpers, incl. a from-scratch SHA-256
  verify.ts       flag normalisation and checking
  progress.ts     hook mirroring server-held progress
  server/         server-only: answers, hints, debriefs, hosts, sessions, store
src/app/api/ctf/
  register/ submit/ hint/ state/ terminal/ vault/ leaderboard/
src/components/ctf/
  SilhouetteScene.tsx     animated SVG scene for every case and puzzle
  SoundToggle.tsx         the on/off control, wired to the audio engine
  DifferenceEngine.tsx    the decoder workbench (slide-over drawer)
  ChallengePanel.tsx      brief, evidence, hints, flag entry, debrief
  EvidenceBoard.tsx       renders each evidence kind
  evidence/Terminal.tsx   simulated shell: ls, cat, curl -I
  evidence/VaultDoor.tsx  deliberately injectable login with a live query preview
```

The decoding tools all run in the browser, but anything that decides a score is
held by the server. The only thing kept in `localStorage` is whether the player
has clicked past the title card.

### Notes on a few deliberate choices

- **SHA-256 is implemented in TypeScript** rather than calling `crypto.subtle`,
  which only exists in secure contexts. Flag checking must not break when the
  game is served over plain HTTP on a LAN address.
- **Answers, hints, debriefs and the terminal filesystem are `server-only`**, so
  the build fails loudly if any of them is ever imported into a client
  component. That import guard is what the leaderboard's integrity rests on.
- **Flag entry is forgiving**: case-insensitive, whitespace-trimmed, and spaces
  fold to underscores — two puzzles decode to plaintext with spaces inside the
  braces, and beginners should not lose to punctuation.
- **The `.brass-panel` class sets no `position`.** This stylesheet loads after
  Tailwind's utilities, so a `position` there would silently beat `fixed` and
  `absolute` utilities on the same element. `.riveted` owns the containing block
  for its rivet decorations instead.

## Adding a challenge

A challenge is now split across the client-safe and server-only halves:

1. Append a `Challenge` to a case in `src/lib/ctf/cases.ts` (title, brief,
   evidence, `hintCount`, lesson, tools).
2. Add its answer hash to `src/lib/ctf/server/answers.ts` — the SHA-256 of the
   normalised flag, lowercased and trimmed with spaces as underscores:

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('brass{your_flag}').digest('hex'))"
   ```

3. Add its hints to `src/lib/ctf/server/hints.ts` and its debrief to
   `src/lib/ctf/server/debriefs.ts`, keyed by the same challenge id.

Keep `hintCount` in step with the number of hints, or the UI will offer a hint
that does not exist.

Supported `evidence` kinds are `document`, `ciphertext`, `source` (injects a real
HTML comment for the view-source challenge), `terminal`, `login`, and `wordlist`.
Adjust `RANKS` in the same file if the point total moves much.

## Verifying

The game has no test runner wired into the repo, but both layers were verified
before shipping:

- Every ciphertext in `cases.ts` was decoded with the same functions the player
  gets in the Difference Engine, and each resulting flag checked against its
  stored hash — all 14 solve.
- The pure-TypeScript SHA-256 was diffed against Node's `crypto` across the
  message-padding boundaries (54–57, 63–65, 119–120, 127–128 bytes) and on
  multi-byte UTF-8 input.
- A scripted browser playthrough completed all five cases against the real API:
  signing the register, unlocking, server-side hint scoring, the terminal
  commands, the HTML comment reaching the DOM, the injection bypass, the finale,
  and the leaderboard showing the correct hint-adjusted total.
- The anti-cheat measures were tested by attacking them: resubmitting a solved
  flag does not double-bank, a forged session cookie is not recorded, the hint
  penalty applies from the server's own record, no route accepts a
  client-supplied score, and duplicate handles are refused case-insensitively.
- The built client bundle was audited for leaks. The only flag still present is
  Case II-1's, which is intentional -- that challenge is "read the page source".

---

## Spoilers — flags

<details>
<summary>Click to reveal all 14 countersigns</summary>

| ID | Flag |
|----|------|
| c1-1 | `BRASS{ash_and_ledger_lines}` |
| c1-2 | `BRASS{iron_tally_eight_bits}` |
| c1-3 | `BRASS{sixteen_fingers}` |
| c2-1 | `BRASS{the_margins_talk}` |
| c2-2 | `BRASS{disallowed_but_not_hidden}` |
| c2-3 | `BRASS{headers_carry_secrets}` |
| c3-1 | `BRASS{thirteen_turns_of_the_lamp}` |
| c3-2 | `BRASS{TELEGRAPH_GHOST}` |
| c3-3 | `BRASS{waltz_of_the_brass_key}` |
| c4-1 | `BRASS{ignatius_rook}` |
| c4-2 | `BRASS{exclusive_or_exclusive_lies}` |
| c4-3 | `BRASS{apostrophe_opens_all_doors}` |
| c5-1 | `BRASS{layers_upon_layers}` |
| c5-2 | `BRASS{the_lamps_go_out_at_dawn}` |

The Case IV vault door opens on any classic tautology or comment injection, e.g.
`' OR '1'='1` or `admin'--`, in either field.

</details>
