'use client'

import { useCallback, useEffect, useState } from 'react'
import { ALL_CHALLENGES, CASES, pointsFor, type Challenge } from './cases'

const STORAGE_KEY = 'brasshaven-files:v1'

export interface Progress {
  /** challenge id -> points banked at the moment it was solved */
  solved: Record<string, number>
  /** challenge id -> how many hints have been unlocked */
  hints: Record<string, number>
  started: boolean
}

const EMPTY: Progress = { solved: {}, hints: {}, started: false }

function load(): Progress {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Progress>
    return {
      solved: parsed.solved ?? {},
      hints: parsed.hints ?? {},
      started: parsed.started ?? false,
    }
  } catch {
    // A corrupt or unreadable store should cost the player a save, not the game.
    return EMPTY
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY)
  // Progress lives in localStorage, which does not exist during SSR. Hydrating
  // from an empty state and filling it in on mount keeps server and client
  // markup identical on the first paint.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setProgress(load())
    setHydrated(true)
  }, [])

  const persist = useCallback((next: Progress) => {
    setProgress(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private browsing or a full quota: play on without a save file.
    }
  }, [])

  const solve = useCallback(
    (challenge: Challenge) => {
      setProgress((current) => {
        if (current.solved[challenge.id] !== undefined) return current
        const next: Progress = {
          ...current,
          solved: {
            ...current.solved,
            [challenge.id]: pointsFor(challenge, current.hints[challenge.id] ?? 0),
          },
        }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [],
  )

  const revealHint = useCallback((challengeId: string) => {
    setProgress((current) => {
      const next: Progress = {
        ...current,
        hints: { ...current.hints, [challengeId]: (current.hints[challengeId] ?? 0) + 1 },
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const start = useCallback(() => {
    setProgress((current) => {
      const next = { ...current, started: true }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const reset = useCallback(() => persist(EMPTY), [persist])

  return { progress, hydrated, solve, revealHint, start, reset }
}

export function scoreOf(progress: Progress): number {
  return Object.values(progress.solved).reduce((sum, p) => sum + p, 0)
}

export function solvedCount(progress: Progress): number {
  return Object.keys(progress.solved).length
}

/**
 * A case unlocks when every challenge in the case before it is closed. The
 * first case is always open.
 */
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
