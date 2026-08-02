'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ArrowPathIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { TOTAL_POINTS, rankFor } from '@/lib/ctf/cases'

interface Entry {
  rank: number
  handle: string
  score: number
  solves: number
  hintsUsed: number
  durationMs: number
}

function duration(ms: number): string {
  if (ms <= 0) return '--'
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

const MEDALS = ['#d1a942', '#b8b8b8', '#a9713f']

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [persistent, setPersistent] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const response = await fetch('/api/ctf/leaderboard?limit=10', { cache: 'no-store' })
      if (!response.ok) throw new Error('bad response')
      const data = await response.json()
      setEntries(data.entries ?? [])
      setPersistent(data.persistent !== false)
      setError(null)
    } catch {
      setError('Could not reach the agency records.')
      setEntries([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="ctf-root relative">
      <div className="ctf-fog" />

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <Link href="/ctf" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to the case board
        </Link>

        <header className="mt-7 text-center">
          <p className="stencil">Ashgrave &amp; Vane -- Register of Detectives</p>
          <h1 className="display gaslight-title flicker mt-1 text-4xl sm:text-5xl">
            The Honours Board
          </h1>
          <p className="mt-3 text-sm italic text-[#b9ab92]">
            Every score below was awarded by the agency, not claimed by the detective.
          </p>
        </header>

        <div className="divider-gear my-8">
          <span className="text-lg">⚙</span>
        </div>

        {!persistent && (
          <div
            className="brass-panel mb-6 p-4 text-sm text-[#cfc3ab]"
            style={{ borderLeft: '3px solid #a03a26' }}
          >
            <strong className="text-[#d98b76]">Scores are not being stored.</strong> The server has
            no database configured, so the board resets whenever it restarts. See{' '}
            <code className="font-mono text-[#8fd3bd]">docs/brasshaven-files.md</code> for the setup.
          </div>
        )}

        {entries === null ? (
          <p className="stencil flicker text-center">Consulting the register…</p>
        ) : entries.length === 0 ? (
          <div className="brass-panel riveted p-8 text-center">
            <TrophyIcon className="mx-auto h-9 w-9 text-[#8f7330]" />
            <p className="display mt-3 text-xl text-[#e9dcc3]">The board is empty</p>
            <p className="mt-2 text-sm text-[#b9ab92]">
              {error ?? 'Nobody has closed a case yet. Be the first name on it.'}
            </p>
            <Link href="/ctf" className="btn-brass mt-6 inline-block">
              Open the first file
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.handle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="brass-panel riveted flex items-center gap-4 p-5"
              >
                <span
                  className="display w-10 shrink-0 text-center text-2xl"
                  style={{ color: MEDALS[entry.rank - 1] ?? '#8f7330' }}
                >
                  {entry.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="display truncate text-lg text-[#e9dcc3]">{entry.handle}</p>
                  <p className="stencil mt-0.5">
                    {rankFor(entry.score).title} · {entry.solves}/14 closed
                    {entry.hintsUsed > 0 && ` · ${entry.hintsUsed} hint${entry.hintsUsed === 1 ? '' : 's'}`}
                    {entry.durationMs > 0 && ` · ${duration(entry.durationMs)}`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="display text-xl text-[#d1a942]">{entry.score}</p>
                  <p className="stencil">of {TOTAL_POINTS}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button type="button" onClick={load} className="btn-ghost inline-flex items-center gap-2">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh the register
          </button>
        </div>
      </div>
    </div>
  )
}
