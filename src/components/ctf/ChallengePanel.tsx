'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline'
import { FLAG_FORMAT, pointsFor, type Challenge, type ToolId } from '@/lib/ctf/cases'
import { critiqueFlag } from '@/lib/ctf/verify'
import type { SubmitResult } from '@/lib/ctf/progress'
import EvidenceBoard from './EvidenceBoard'
import SilhouetteScene from './SilhouetteScene'

/** Minimal inline formatter for the briefing copy: **bold**, *italic* and `code`. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, pi) => (
        <p key={pi} className="mb-3 last:mb-0">
          {paragraph.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((token, ti) => {
            if (token.startsWith('**') && token.endsWith('**')) {
              return (
                <strong key={ti} className="text-[#d1a942]">
                  {token.slice(2, -2)}
                </strong>
              )
            }
            if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
              return (
                <em key={ti} className="text-[#e0d3b8]">
                  {token.slice(1, -1)}
                </em>
              )
            }
            if (token.startsWith('`') && token.endsWith('`')) {
              return (
                <code
                  key={ti}
                  className="rounded-sm bg-black/40 px-1.5 py-0.5 font-mono text-[0.8em] text-[#8fd3bd]"
                >
                  {token.slice(1, -1)}
                </code>
              )
            }
            return <span key={ti}>{token}</span>
          })}
        </p>
      ))}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="stencil mb-2">{title}</p>
      {children}
    </section>
  )
}

export default function ChallengePanel({
  challenge,
  solvedFor,
  hintsUsed,
  hintText,
  debrief,
  competing,
  onRevealHint,
  onSubmitFlag,
  onOpenTool,
  onBack,
}: {
  challenge: Challenge
  solvedFor: number | undefined
  hintsUsed: number
  hintText: string[]
  /** Released by the server once the flag is accepted. */
  debrief: string
  /** True once a handle is claimed -- solves are being banked to the board. */
  competing: boolean
  onRevealHint: () => Promise<{ error?: string }>
  onSubmitFlag: (flag: string) => Promise<SubmitResult>
  onOpenTool: (tool: ToolId | null) => void
  onBack: () => void
}) {
  const [entry, setEntry] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [checking, setChecking] = useState(false)
  const [hintPending, setHintPending] = useState(false)
  const solved = solvedFor !== undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (solved || checking) return

    // Catch obvious format mistakes before spending a request on them.
    const critique = critiqueFlag(entry)
    if (critique) {
      setFeedback(critique)
      setShake((s) => s + 1)
      return
    }

    setChecking(true)
    const result = await onSubmitFlag(entry)
    setChecking(false)

    if (result.correct) {
      setFeedback(null)
      return
    }

    setFeedback(
      result.error ?? 'That is not the countersign. Read it again -- and read it exactly.',
    )
    setShake((s) => s + 1)
  }

  const askForHint = async () => {
    setHintPending(true)
    const result = await onRevealHint()
    setHintPending(false)
    if (result.error) setFeedback(result.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to the case
        </button>
        <div className="flex items-center gap-2">
          <span className="stencil">{challenge.category}</span>
          <span className="stencil" style={{ color: '#d1a942' }}>
            {challenge.points} pts
          </span>
        </div>
      </div>

      <header>
        <h2 className="display gaslight-title text-3xl sm:text-4xl">{challenge.title}</h2>
        {solved && (
          <div className="mt-3 inline-block">
            <span className="stamp inline-block">Closed -- {solvedFor} pts</span>
          </div>
        )}
      </header>

      <SilhouetteScene id={challenge.id} height={180} />

      <div className="brass-panel riveted p-6 text-[0.95rem] leading-relaxed text-[#cfc3ab]">
        <Rich text={challenge.brief} />
      </div>

      <Section title="Evidence">
        <div className="space-y-6">
          {challenge.evidence.map((e, i) => (
            <EvidenceBoard key={i} evidence={e} />
          ))}
        </div>
      </Section>

      {challenge.tools.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="stencil">Suggested tools</span>
          {challenge.tools.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => onOpenTool(tool)}
              className="btn-ghost inline-flex items-center gap-1.5"
            >
              <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
              {tool}
            </button>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------ hints */}
      <Section
        title={`Hints -- each one costs a fifth of the case fee (${hintsUsed} of ${challenge.hintCount} used)`}
      >
        <div className="space-y-2">
          {hintText.map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="brass-panel px-4 py-3 text-sm leading-relaxed text-[#cfc3ab]"
            >
              <span className="stencil mr-2">{i + 1}</span>
              {hint}
            </motion.div>
          ))}
          {hintsUsed < challenge.hintCount && !solved && (
            <button
              type="button"
              onClick={askForHint}
              disabled={hintPending}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <LightBulbIcon className="h-4 w-4" />
              {hintPending
                ? 'Asking…'
                : `Ask the file clerk (${pointsFor(challenge, hintsUsed + 1)} pts if you solve it after this)`}
            </button>
          )}
        </div>
      </Section>

      {/* --------------------------------------------------------- the flag */}
      {!solved ? (
        <motion.form
          key={shake}
          onSubmit={submit}
          animate={shake > 0 ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
          transition={{ duration: 0.35 }}
          className="brass-panel riveted space-y-3 p-6"
        >
          <label className="stencil block" htmlFor="flag-entry">
            Submit the countersign -- format {FLAG_FORMAT}
          </label>
          {!competing && (
            <p className="text-xs italic text-[#b9ab92]">
              Practice run -- you have not signed the register, so this solve will not reach the
              leaderboard.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="flag-entry"
              className="field"
              spellCheck={false}
              autoComplete="off"
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value)
                setFeedback(null)
              }}
              placeholder="BRASS{...}"
            />
            <button type="submit" className="btn-brass shrink-0" disabled={checking}>
              {checking ? 'Checking…' : 'File it'}
            </button>
          </div>
          <AnimatePresence>
            {feedback && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs text-[#d98b76]"
              >
                {feedback}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Section title="Case notes">
            <div className="paper paper-aged p-6 text-[0.95rem] leading-relaxed">
              <Rich text={debrief} />
            </div>
          </Section>

          <Section title="What you actually learned">
            <div
              className="brass-panel p-6 text-[0.92rem] leading-relaxed text-[#cfc3ab]"
              style={{ borderLeft: '3px solid #5c8f80' }}
            >
              <div className="mb-3 flex items-center gap-2 text-[#5c8f80]">
                <LockOpenIcon className="h-4 w-4" />
                <span className="stencil" style={{ color: '#5c8f80' }}>
                  Field craft
                </span>
              </div>
              <Rich text={challenge.lesson} />
            </div>
          </Section>

          <button type="button" onClick={onBack} className="btn-brass w-full">
            Return to the case file
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
