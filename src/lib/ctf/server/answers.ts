import 'server-only'

/**
 * Answer hashes -- SERVER ONLY.
 *
 * The `server-only` import above makes the build fail loudly if this module is
 * ever pulled into a client component. That guarantee is the foundation of the
 * anti-cheat design: if these hashes reach the browser, a player can check
 * flags locally and the leaderboard becomes meaningless.
 *
 * Keys are challenge ids from src/lib/ctf/cases.ts. Values are the SHA-256 of
 * the normalised flag (lowercased, trimmed, spaces folded to underscores).
 */
const ANSWER_HASHES: Record<string, string> = {
  'c1-1': '2d63eba42dafb947010804468b3948befeb096114f7ddacb3cb6fcaa69e7200e',
  'c1-2': '8d209f4f7f4793a72fcedd1eae333b6912383f2ccd5175af63be29ef5bf12e97',
  'c1-3': '40c0f301c6fcda85a2dac95a455dc1767407d13bd523691455ef3ffa6ffb05d0',
  'c2-1': '9b13a53b9b38f95474406e2b31031e7287255726040ee8d225912d1ef28c680d',
  'c2-2': '86e1fc2a4f9e9115c716d4687168c47c248850d6c90f1c827cd4d784c559de99',
  'c2-3': '4abad9b8ab6137370fe64c098bf4770f383d3782148555a747719731c19daee8',
  'c3-1': 'b92c0b2f0ab1cfabfe47322519f5c8d323f7a9207e2bb861c553fc683c541224',
  'c3-2': 'a6fb9656e5249c75d02c52acf3885a3d4eca4c69c5f16872003a7ba0864d6e99',
  'c3-3': 'a8aa3a50e66ad66339af25f5d227b9dba58d4bebe0d706df1ce69cee4885c3d2',
  'c4-1': '06cd8a968105f19d8faa42177ebdba83e21086df16c178666f79aae91660fec7',
  'c4-2': '446eeae50fa31d08829d0f51a63e12056b1555fc1b140e33913ade53596e66e1',
  'c4-3': 'efe0aff832359c99e2cb5342a5985f7c1e04ab1642036ef871313034e1bc746e',
  'c5-1': '9fa5663d233fda7ed144367e61f13620920c2b8e3bf5cb9e93b51bd079f28775',
  'c5-2': 'b9aab7040ea5c660a65bef9b67c3d6c44ddb0a7621e911ed62f7404693c971dd',
  'm1-1': 'd19051613008722cf1b6abaa7703558152192310f3ed3aef944d55ba2232380a',
  'm1-2': 'df17bb1752073e9ea120c331905b6803804ba4aa2087aa8d23b02fcbf8fdca70',
  'm1-3': '8b6703dca7711befbea274be51bf921c9048c6c539a9429d30ab447394619c1c',
  'x1-1': '9a535b190486c3b5cd68578138bd08ce450937aefd93e1ecc47629dec0c7d458',
  'x1-2': '3b874b5c855d5d413942246ddc703f27f306a7ff2945bf9f0c8df9c3ddc40963',
  'x2-2': '2040e247144b019f4c4ea85105c92bb7b3fe6b116fa017f07f7d569c11009d96',
}

export function isCorrectFlag(challengeId: string, normalisedFlag: string, hash: (s: string) => string): boolean {
  const expected = ANSWER_HASHES[challengeId]
  if (!expected) return false
  return hash(normalisedFlag) === expected
}

export function isKnownChallenge(challengeId: string): boolean {
  return challengeId in ANSWER_HASHES
}
