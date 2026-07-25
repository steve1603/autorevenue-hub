'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WrenchScrewdriverIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  CASES,
  TOTAL_POINTS,
  rankFor,
  type ToolId,
} from '@/lib/ctf/cases'
import {
  caseProgress,
  isCaseUnlocked,
  isGameComplete,
  scoreOf,
  solvedCount,
  useProgress,
} from '@/lib/ctf/progress'
import DifferenceEngine from '@/components/ctf/DifferenceEngine'
import ChallengePanel from '@/components/ctf/ChallengePanel'

const TOTAL_CHALLENGES = CASES.reduce((n, c) => n + c.challenges.length, 0)

export default function BrasshavenFiles() {
  const { progress, hydrated, solve, revealHint, start, reset } = useProgress()
  const [openCaseId, setOpenCaseId] = useState<string | null>(null)
  const [openChallengeId, setOpenChallengeId] = useState<string | null>(null)
  const [engineOpen, setEngineOpen] = useState(false)
  const [requestedTool, setRequestedTool] = useState<ToolId | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const score = scoreOf(progress)
  const rank = rankFor(score)
  const solved = solvedCount(progress)
  const complete = isGameComplete(progress)

  const openCase = useMemo(() => CASES.find((c) => c.id === openCaseId) ?? null, [openCaseId])
  const openChallenge = useMemo(
    () => openCase?.challenges.find((ch) => ch.id === openChallengeId) ?? null,
    [openCase, openChallengeId],
  )

  const openTool = (tool: ToolId | null) => {
    setRequestedTool(tool)
    setEngineOpen(true)
  }

  // Nothing renders until localStorage has been read, so the server-rendered
  // markup and the first client paint agree.
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

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ['Encoding', 'Base64, hex, binary'],
              ['Recon', 'Source, robots.txt, headers'],
              ['Attack', 'Ciphers, hashes, injection'],
            ].map(([title, blurb]) => (
              <div key={title} className="brass-panel px-4 py-3">
                <p className="stencil" style={{ color: '#d1a942' }}>
                  {title}
                </p>
                <p className="mt-1 text-xs text-[#b9ab92]">{blurb}</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={start} className="btn-brass mt-8 px-10 py-4 text-sm">
            Open the first file
          </button>

          <p className="mt-6 text-xs" style={{ color: '#7d7364' }}>
            Everything here is a simulation and runs entirely in your browser. Use these skills only
            on systems you own or are authorised to test.
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
        {/* ---------------------------------------------------------- header */}
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
              <p className="stencil">Ashgrave &amp; Vane</p>
              <h1 className="display gaslight-title text-xl">The Brasshaven Files</h1>
            </button>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="stencil">{rank.title}</p>
                <p className="display text-lg text-[#d1a942]">
                  {score}
                  <span className="text-xs text-[#8f7330]"> / {TOTAL_POINTS}</span>
                </p>
              </div>
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

        <AnimatePresence mode="wait">
          {/* ------------------------------------------------------ challenge */}
          {openChallenge && openCase ? (
            <ChallengePanel
              key={openChallenge.id}
              challenge={openChallenge}
              solvedFor={progress.solved[openChallenge.id]}
              hintsUsed={progress.hints[openChallenge.id] ?? 0}
              onRevealHint={() => revealHint(openChallenge.id)}
              onSolve={() => solve(openChallenge)}
              onOpenTool={openTool}
              onBack={() => setOpenChallengeId(null)}
            />
          ) : openCase ? (
            /* ------------------------------------------------------ one case */
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
            /* ----------------------------------------------------- the board */
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

              {CASES.map((file, i) => {
                const unlocked = isCaseUnlocked(i, progress)
                const { done, total, complete: caseDone } = caseProgress(i, progress)

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
                {confirmReset ? (
                  <div className="inline-flex flex-wrap items-center justify-center gap-3">
                    <span className="text-xs italic text-[#b9ab92]">
                      Burn the file? Every countersign and point is lost.
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ color: '#d98b76', borderColor: '#a03a26' }}
                      onClick={() => {
                        reset()
                        setConfirmReset(false)
                        setOpenCaseId(null)
                        setOpenChallengeId(null)
                      }}
                    >
                      Burn it
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setConfirmReset(false)}>
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" />
                    Start a new investigation
                  </button>
                )}
                <p className="mt-6 text-xs text-[#7d7364]">
                  Progress is stored in this browser only. Use these skills only on systems you own
                  or are authorised to test.
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
