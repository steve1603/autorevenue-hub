'use client'

import { useCallback, useEffect, useState } from 'react'
import { ALL_CHALLENGES, CASES } from './cases'

/**
 * Client-side view of progress.
 *
 * The server owns everything that affects a score: which flags are correct,
 * which hints were taken, and what each solve was worth. This hook only mirrors
 * what the server reports. The single piece of state kept locally is whether the
 * player has clicked past the title card, which is cosmetic.
 */

const STARTED_KEY = 'brasshaven-files:started'

export interface HintState {
  used: number
  text: string[]
}

export interface Progress {
  /** challenge id -> points banked, as awarded by the server */
  solved: Record<string, number>
  /** Post-solve story, released by the server only once a flag is accepted. */
  debriefs: Record<string, string>
  hints: Record<string, HintState>
  handle: string | null
  started: boolean
}

const EMPTY: Progress = { solved: {}, debriefs: {}, hints: {}, handle: null, started: false }

export interface SubmitResult {
  correct: boolean
  recorded?: boolean
  alreadySolved?: boolean
  points?: number
  debrief?: string
  error?: string
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY)
  const [hydrated, setHydrated] = useState(false)
  /** False when the server is storing scores in memory (development only). */
  const [persistent, setPersistent] = useState(true)
  /** False when the server has no session secret, so no score can be recorded. */
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true)

  const load = useCallback(async () => {
    let started = false
    try {
      started = window.localStorage.getItem(STARTED_KEY) === '1'
    } catch {
      // Private browsing: the player just sees the title card again.
    }

    try {
      const response = await fetch('/api/ctf/state', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setPersistent(data.persistent !== false)
        setLeaderboardEnabled(data.leaderboardEnabled !== false)
        setProgress({
          solved: data.solved ?? {},
          debriefs: data.debriefs ?? {},
          hints: data.hints ?? {},
          handle: data.player?.handle ?? null,
          started,
        })
        return
      }
    } catch {
      // Offline or the API is unreachable -- the decoding tools still work, but
      // flags cannot be checked, and the UI says so rather than failing silently.
    }

    setProgress({ ...EMPTY, started })
  }, [])

  useEffect(() => {
    load().finally(() => setHydrated(true))
  }, [load])

  const start = useCallback(() => {
    try {
      window.localStorage.setItem(STARTED_KEY, '1')
    } catch {
      /* ignore */
    }
    setProgress((current) => ({ ...current, started: true }))
  }, [])

  const register = useCallback(async (handle: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch('/api/ctf/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      })
      const data = await response.json()
      if (!response.ok) return { error: data.error ?? 'Could not claim that name.' }

      setProgress((current) => ({ ...current, handle: data.handle }))
      setPersistent(data.persistent !== false)
      return {}
    } catch {
      return { error: 'Could not reach the agency. Check your connection.' }
    }
  }, [])

  const submitFlag = useCallback(
    async (challengeId: string, flag: string): Promise<SubmitResult> => {
      try {
        const response = await fetch('/api/ctf/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId, flag }),
        })
        const data = await response.json()

        if (response.status === 429) return { correct: false, error: data.error }
        if (!response.ok) return { correct: false, error: data.error ?? 'The wire went dead.' }

        if (data.correct && data.recorded) {
          setProgress((current) => ({
            ...current,
            solved: { ...current.solved, [challengeId]: data.points ?? 0 },
            debriefs: { ...current.debriefs, [challengeId]: data.debrief ?? '' },
          }))
        } else if (data.correct) {
          // Correct without a handle: reflect it locally so the debrief shows,
          // but nothing is banked to the leaderboard.
          setProgress((current) => ({
            ...current,
            solved: { ...current.solved, [challengeId]: 0 },
            debriefs: { ...current.debriefs, [challengeId]: data.debrief ?? '' },
          }))
        }

        return data as SubmitResult
      } catch {
        return { correct: false, error: 'Could not reach the agency. Check your connection.' }
      }
    },
    [],
  )

  const revealHint = useCallback(async (challengeId: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch('/api/ctf/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      const data = await response.json()
      if (!response.ok) return { error: data.error ?? 'The file clerk is out.' }

      setProgress((current) => ({
        ...current,
        hints: {
          ...current.hints,
          [challengeId]: { used: data.hintsUsed ?? data.hints.length, text: data.hints ?? [] },
        },
      }))
      return {}
    } catch {
      return { error: 'Could not reach the agency. Check your connection.' }
    }
  }, [])

  return {
    progress,
    hydrated,
    persistent,
    leaderboardEnabled,
    start,
    register,
    submitFlag,
    revealHint,
    refresh: load,
  }
}

export function scoreOf(progress: Progress): number {
  return Object.values(progress.solved).reduce((sum, p) => sum + p, 0)
}

export function solvedCount(progress: Progress): number {
  return Object.keys(progress.solved).length
}

export function hintsUsedFor(progress: Progress, challengeId: string): number {
  return progress.hints[challengeId]?.used ?? 0
}

export function hintTextFor(progress: Progress, challengeId: string): string[] {
  return progress.hints[challengeId]?.text ?? []
}

export function debriefFor(progress: Progress, challengeId: string): string {
  return progress.debriefs[challengeId] ?? ''
}

/** A case unlocks when every challenge in the previous case is closed. */
export function isCaseUnlocked(caseIndex: number, progress: Progress): boolean {
  if (caseIndex === 0) return true
  return CASES[caseIndex - 1].challenges.every((ch) => progress.solved[ch.id] !== undefined)
}

export function caseProgress(caseIndex: number, progress: Progress) {
  const challenges = CASES[caseIndex].challenges
  const done = challenges.filter((ch) => progress.solved[ch.id] !== undefined).length
  return { done, total: challenges.length, complete: done === challenges.length }
}

export function isGameComplete(progress: Progress): boolean {
  return ALL_CHALLENGES.every((ch) => progress.solved[ch.id] !== undefined)
}
