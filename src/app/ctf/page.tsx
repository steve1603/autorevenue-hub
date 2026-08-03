'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WrenchScrewdriverIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import type { ToolId } from '@/lib/ctf/cases'
import {
  DEFAULT_TRACK,
  TRACKS,
  rankForTrack,
  totalPointsFor,
  trackFor,
  type Difficulty,
} from '@/lib/ctf/tracks'
import {
  caseProgress,
  debriefFor,
  hintTextFor,
  hintsUsedFor,
  isCaseUnlocked,
  isTrackComplete,
  trackScore,
  trackSolved,
  useProgress,
} from '@/lib/ctf/progress'
import DifferenceEngine from '@/components/ctf/DifferenceEngine'
import ChallengePanel from '@/components/ctf/ChallengePanel'
import SilhouetteScene from '@/components/ctf/SilhouetteScene'
import SoundToggle from '@/components/ctf/SoundToggle'
import { audio, type Mood } from '@/lib/ctf/audio'

const TRACK_KEY = 'brasshaven-files:track'

export default function BrasshavenFiles() {
  const { progress, hydrated, persistent, leaderboardEnabled, start, register, submitFlag, revealHint } =
    useProgress()
  const [openCaseId, setOpenCaseId] = useState<string | null>(null)
  const [openChallengeId, setOpenChallengeId] = useState<string | null>(null)
  const [engineOpen, setEngineOpen] = useState(false)
  const [requestedTool, setRequestedTool] = useState<ToolId | null>(null)
  const [handleEntry, setHandleEntry] = useState('')
  const [handleError, setHandleError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_TRACK)

  // Which track the player last chose. Cosmetic routing only -- every score is
  // still awarded and stored by the server.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TRACK_KEY)
      if (stored) setDifficulty(trackFor(stored).id)
    } catch {
      /* ignore */
    }
  }, [])

  const track = trackFor(difficulty)
  const CASES = track.cases
  const TOTAL_CHALLENGES = CASES.reduce((n, c) => n + c.challenges.length, 0)
  const TOTAL_POINTS = totalPointsFor(difficulty)

  const score = trackScore(CASES, progress)
  const rank = rankForTrack(difficulty, score)
  const solved = trackSolved(CASES, progress)
  const complete = isTrackComplete(CASES, progress)
  const unlockedCount = CASES.filter((_, i) => isCaseUnlocked(CASES, i, progress)).length

  const chooseTrack = (id: Difficulty) => {
    setDifficulty(id)
    setOpenCaseId(null)
    setOpenChallengeId(null)
    try {
      window.localStorage.setItem(TRACK_KEY, id)
    } catch {
      /* ignore */
    }
  }

  const openCase = useMemo(() => CASES.find((c) => c.id === openCaseId) ?? null, [openCaseId])
  const openChallenge = useMemo(
    () => openCase?.challenges.find((ch) => ch.id === openChallengeId) ?? null,
    [openCase, openChallengeId],
  )

  // The ambient bed shifts with the setting: streets are open, the foundry and
  // the corridors are muffled, the finale opens out into dawn.
  const mood: Mood =
    openCaseId === 'case-2' || openCaseId === 'case-4'
      ? 'interior'
      : openCaseId === 'case-5'
        ? 'dawn'
        : 'street'

  useEffect(() => {
    audio.setMood(mood)
  }, [mood])

  // Ring once when a new case opens, but not on first render.
  const [knownUnlocked, setKnownUnlocked] = useState<number | null>(null)
  useEffect(() => {
    if (knownUnlocked !== null && unlockedCount > knownUnlocked) audio.cue('unlock')
    setKnownUnlocked(unlockedCount)
  }, [unlockedCount, knownUnlocked])

  const openTool = (tool: ToolId | null) => {
    setRequestedTool(tool)
    setEngineOpen(true)
  }

  const claimHandle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (claiming) return
    setClaiming(true)
    const result = await register(handleEntry)
    setClaiming(false)
    if (result.error) {
      setHandleError(result.error)
      return
    }
    setHandleError(null)
    start()
  }

  if (!hydrated) {
    return (
      <div className="ctf-root flex items-center justify-center">
        <p className="stencil flicker">Lighting the lamps…</p>
      </div>
    )
  }

  /* ------------------------------------------------------------- title card */
  if (!progress.started) {
    return (
      <div className="ctf-root relative flex min-h-screen items-center justify-center px-5 py-16">
        <div className="ctf-fog" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-2xl text-center"
        >
          <p className="stencil mb-4">Ashgrave &amp; Vane -- Consulting Detectives -- Est. 1871</p>

          <h1 className="display gaslight-title flicker text-5xl leading-tight sm:text-7xl">
            The Brasshaven Files
          </h1>

          <p className="mt-4 text-lg italic text-[#b9ab92]">
            A capture-the-flag adventure for people who have never captured a flag
          </p>

          <SilhouetteScene id="title" height={210} className="mt-7" />

          {/* ------------------------------------------------ pick a difficulty */}
          <div className="mt-7 space-y-2 text-left">
            <p className="stencil">Choose your case load</p>
            {TRACKS.map((t) => {
              const chosen = t.id === difficulty
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseTrack(t.id)}
                  className="brass-panel block w-full p-4 text-left transition hover:border-[#d1a942]"
                  style={chosen ? { borderColor: '#d1a942', background: 'rgba(209,169,66,0.08)' } : undefined}
                  aria-pressed={chosen}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="display text-lg text-[#e9dcc3]">{t.name}</span>
                    <span className="stencil shrink-0" style={{ color: chosen ? '#d1a942' : undefined }}>
                      {t.cases.length} {t.cases.length === 1 ? 'case' : 'cases'} ·{' '}
                      {totalPointsFor(t.id)} pts
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-[#b9ab92]">{t.tagline}</span>
                  {chosen && (
                    <span className="mt-2 block text-xs leading-relaxed text-[#7d7364]">
                      {t.audience}
                      <br />
                      <span className="text-[#6f9c8e]">Covers: {t.covers}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="divider-gear my-8">
            <span className="text-lg">⚙</span>
          </div>

          <div className="brass-panel riveted p-7 text-left text-[0.95rem] leading-relaxed text-[#cfc3ab]">
            <p className="mb-3">
              The rain came down like it had a grudge, and the gaslamps did what they could about it,
              which was nothing.
            </p>
            <p className="mb-3">
              Your senior partner walked into the fog nine days ago and did not walk back out. She
              left you the office, the rent, and a filing cabinet somebody tried to burn.
            </p>
            <p>
              Five cases. Fourteen countersigns. Every cipher in this city can be cracked at the desk
              you are sitting at -- no other tools, no other tabs, no experience required.
            </p>
          </div>

          {/* ------------------------------------------------ sign the register */}
          {!leaderboardEnabled ? (
            <div className="brass-panel mt-7 p-6 text-left">
              <p className="stencil mb-2">The honours board is closed</p>
              <p className="text-sm leading-relaxed text-[#cfc3ab]">
                This server has no <code className="font-mono text-[#8fd3bd]">CTF_SESSION_SECRET</code>{' '}
                configured, so scores cannot be recorded. Every case is still fully playable and
                flags are still checked -- nothing is kept afterwards.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={start} className="btn-brass px-10 py-4 text-sm">
                  Open the first file
                </button>
                <SoundToggle />
              </div>
            </div>
          ) : progress.handle ? (
            <div className="mt-7">
              <p className="stencil">Signed in as</p>
              <p className="display text-2xl text-[#d1a942]">{progress.handle}</p>
              <button type="button" onClick={start} className="btn-brass mt-5 px-10 py-4 text-sm">
                Open the first file
              </button>
            </div>
          ) : (
            <form onSubmit={claimHandle} className="brass-panel mt-7 space-y-3 p-6 text-left">
              <label className="stencil block" htmlFor="handle">
                Sign the register to appear on the honours board
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="handle"
                  className="field"
                  value={handleEntry}
                  maxLength={24}
                  autoComplete="off"
                  placeholder="Detective name"
                  onChange={(e) => {
                    setHandleEntry(e.target.value)
                    setHandleError(null)
                  }}
                />
                <button type="submit" className="btn-brass shrink-0" disabled={claiming}>
                  {claiming ? 'Signing…' : 'Sign in'}
                </button>
              </div>
              {handleError && <p className="font-mono text-xs text-[#d98b76]">{handleError}</p>}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="button" onClick={start} className="btn-ghost">
                  Play without signing
                </button>
                <Link href="/ctf/leaderboard" className="btn-ghost inline-flex items-center gap-1.5">
                  <TrophyIcon className="h-3.5 w-3.5" />
                  Honours board
                </Link>
                <SoundToggle />
              </div>
            </form>
          )}

          <p className="mt-6 text-xs" style={{ color: '#7d7364' }}>
            Everything here is a simulation. Use these skills only on systems you own or are
            authorised to test.
          </p>
        </motion.div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ game */
  return (
    <div className="ctf-root relative">
      <div className="ctf-fog" />

      <div className="relative z-10 mx-auto max-w-4xl px-5 py-8 sm:py-12">
        <header className="brass-panel riveted mb-8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setOpenCaseId(null)
                setOpenChallengeId(null)
              }}
              className="text-left"
            >
              <p className="stencil">
                {progress.handle ?? (leaderboardEnabled ? 'Unsigned -- practice run' : 'Board closed -- practice run')}
              </p>
              <h1 className="display gaslight-title text-xl">{track.name}</h1>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="stencil">{rank.title}</p>
                <p className="display text-lg text-[#d1a942]">
                  {score}
                  <span className="text-xs text-[#8f7330]"> / {TOTAL_POINTS}</span>
                </p>
              </div>
              {leaderboardEnabled && (
                <Link href="/ctf/leaderboard" className="btn-ghost inline-flex items-center gap-2">
                  <TrophyIcon className="h-4 w-4" />
                  Board
                </Link>
              )}
              <SoundToggle />
              <button
                type="button"
                onClick={() => openTool(null)}
                className="btn-brass inline-flex items-center gap-2"
              >
                <WrenchScrewdriverIcon className="h-4 w-4" />
                Engine
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #8f7330, #e0bd5c)' }}
                initial={false}
                animate={{ width: `${(solved / TOTAL_CHALLENGES) * 100}%` }}
                transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              />
            </div>
            <p className="stencil mt-2">
              {solved} of {TOTAL_CHALLENGES} countersigns filed
            </p>
          </div>
        </header>

        {!persistent && (
          <div
            className="brass-panel mb-6 p-4 text-sm text-[#cfc3ab]"
            style={{ borderLeft: '3px solid #a03a26' }}
          >
            <strong className="text-[#d98b76]">No database configured.</strong> Scores are held in
            memory and will be lost when the server restarts.
          </div>
        )}

        <AnimatePresence mode="wait">
          {openChallenge && openCase ? (
            <ChallengePanel
              key={openChallenge.id}
              challenge={openChallenge}
              solvedFor={progress.solved[openChallenge.id]}
              hintsUsed={hintsUsedFor(progress, openChallenge.id)}
              hintText={hintTextFor(progress, openChallenge.id)}
              debrief={debriefFor(progress, openChallenge.id)}
              competing={progress.handle !== null}
              onRevealHint={() => revealHint(openChallenge.id)}
              onSubmitFlag={(flag) => submitFlag(openChallenge.id, flag)}
              onOpenTool={openTool}
              onBack={() => setOpenChallengeId(null)}
            />
          ) : openCase ? (
            <motion.div
              key={openCase.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <button
                type="button"
                onClick={() => setOpenCaseId(null)}
                className="btn-ghost inline-flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                All case files
              </button>

              <header>
                <p className="stencil">Case File No. {openCase.number}</p>
                <h2 className="display gaslight-title text-4xl">{openCase.title}</h2>
                <p className="mt-1 text-sm italic text-[#b9ab92]">{openCase.subtitle}</p>
              </header>

              <SilhouetteScene id={openCase.id} height={190} />

              <blockquote className="border-l-2 border-[#5c8f80] pl-4 text-sm italic leading-relaxed text-[#9fb5ad]">
                {openCase.epigraph}
              </blockquote>

              <div className="brass-panel riveted whitespace-pre-line p-6 text-[0.95rem] leading-relaxed text-[#cfc3ab]">
                {openCase.brief}
              </div>

              <div className="space-y-3">
                {openCase.challenges.map((ch, i) => {
                  const done = progress.solved[ch.id] !== undefined
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setOpenChallengeId(ch.id)}
                      className="brass-panel flex w-full items-center gap-4 p-5 text-left transition hover:border-[#d1a942]"
                    >
                      <span
                        className="display shrink-0 text-2xl"
                        style={{ color: done ? '#5c8f80' : '#8f7330' }}
                      >
                        {done ? <CheckCircleIcon className="h-7 w-7" /> : `0${i + 1}`}
                      </span>
                      <span className="flex-1">
                        <span className="display block text-lg text-[#e9dcc3]">{ch.title}</span>
                        <span className="stencil">{ch.category}</span>
                      </span>
                      <span className="stencil shrink-0" style={{ color: done ? '#5c8f80' : '#d1a942' }}>
                        {done ? `${progress.solved[ch.id]} pts` : `${ch.points} pts`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {complete && (
                <div className="paper paper-aged mb-6 p-7">
                  <p className="stencil" style={{ color: '#7a5a1e' }}>
                    Every file closed
                  </p>
                  <h2 className="display mt-1 text-3xl text-[#241a12]">Ghost of Brasshaven</h2>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[#3a2a1c]">
                    Fourteen countersigns, {score} points, and a partner somewhere over the river with
                    nine airships and a head start. The lamps go out at dawn.
                  </p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[#3a2a1c]">
                    Real cases await: <strong>picoCTF</strong> for beginners, <strong>OverTheWire
                    Bandit</strong> for the shell, <strong>CryptoHack</strong> if the ciphers were
                    your favourite part.
                  </p>
                </div>
              )}

              <div className="divider-gear mb-2">
                <span className="stencil">The Case Board</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pb-2">
                <span className="stencil">Difficulty</span>
                {TRACKS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTrack(t.id)}
                    className="btn-ghost"
                    style={
                      t.id === difficulty
                        ? { background: 'rgba(209,169,66,0.25)', color: '#e9dcc3', borderColor: '#d1a942' }
                        : undefined
                    }
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {CASES.map((file, i) => {
                const unlocked = isCaseUnlocked(CASES, i, progress)
                const { done, total, complete: caseDone } = caseProgress(CASES, i, progress)

                return (
                  <button
                    key={file.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setOpenCaseId(file.id)}
                    className="brass-panel riveted flex w-full items-start gap-5 p-6 text-left transition disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:border-[#d1a942]"
                  >
                    <span
                      className="display shrink-0 text-3xl"
                      style={{ color: caseDone ? '#5c8f80' : '#8f7330' }}
                    >
                      {file.number}
                    </span>

                    <span className="flex-1">
                      <span className="display block text-xl text-[#e9dcc3]">{file.title}</span>
                      <span className="mt-0.5 block text-sm italic text-[#b9ab92]">
                        {file.subtitle}
                      </span>
                      <span className="stencil mt-2 block">
                        {unlocked ? `${done} of ${total} closed` : 'Sealed -- close the previous file'}
                      </span>
                    </span>

                    {!unlocked && <LockClosedIcon className="h-5 w-5 shrink-0 text-[#8f7330]" />}
                    {caseDone && <CheckCircleIcon className="h-6 w-6 shrink-0 text-[#5c8f80]" />}
                  </button>
                )
              })}

              <footer className="pt-8 text-center">
                <Link href="/ctf/leaderboard" className="btn-ghost inline-flex items-center gap-2">
                  <TrophyIcon className="h-3.5 w-3.5" />
                  See the honours board
                </Link>
                <p className="mt-6 text-xs" style={{ color: '#7d7364' }}>
                  Flags are checked by the agency, not your browser. Use these skills only on systems
                  you own or are authorised to test.
                </p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DifferenceEngine
        open={engineOpen}
        onClose={() => setEngineOpen(false)}
        initialTool={requestedTool}
      />
    </div>
  )
}
