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

## How it is put together

```
src/app/ctf/
  page.tsx        game shell: title card, case board, case view, score, ranks
  layout.tsx      route metadata
  ctf.css         gaslamp theme, scoped to .ctf-root (no image assets)
src/lib/ctf/
  cases.ts        all narrative and puzzle data; answers stored as SHA-256
  ciphers.ts      pure encode/decode helpers, incl. a from-scratch SHA-256
  verify.ts       flag normalisation and checking
  progress.ts     localStorage-backed progress hook
src/components/ctf/
  DifferenceEngine.tsx    the decoder workbench (slide-over drawer)
  ChallengePanel.tsx      brief, evidence, hints, flag entry, debrief
  EvidenceBoard.tsx       renders each evidence kind
  evidence/Terminal.tsx   simulated shell: ls, cat, curl -I
  evidence/VaultDoor.tsx  deliberately injectable login with a live query preview
```

Everything runs client-side. There is no server component to the game, no
network calls, and no data leaves the browser — progress lives in
`localStorage` under `brasshaven-files:v1`.

### Notes on a few deliberate choices

- **SHA-256 is implemented in TypeScript** rather than calling `crypto.subtle`,
  which only exists in secure contexts. Flag checking must not break when the
  game is served over plain HTTP on a LAN address.
- **Answers are stored as hashes**, so reading the JavaScript bundle does not
  spoil the game by accident.
- **Flag entry is forgiving**: case-insensitive, whitespace-trimmed, and spaces
  fold to underscores — two puzzles decode to plaintext with spaces inside the
  braces, and beginners should not lose to punctuation.
- **The `.brass-panel` class sets no `position`.** This stylesheet loads after
  Tailwind's utilities, so a `position` there would silently beat `fixed` and
  `absolute` utilities on the same element. `.riveted` owns the containing block
  for its rivet decorations instead.

## Adding a challenge

Append a `Challenge` to a case in `src/lib/ctf/cases.ts`. The only fiddly field
is `answerHash`, which is the SHA-256 of the normalised flag — lowercased,
trimmed, spaces as underscores:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('brass{your_flag}').digest('hex'))"
```

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
- A scripted browser playthrough completed all five cases: unlocking, hint
  scoring, the terminal commands, the HTML comment actually reaching the DOM, the
  injection bypass, reload persistence, and the finale.

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
