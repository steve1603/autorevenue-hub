'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'
import type { EffortLevel, OfferResult, ProgramResult, ScanResult } from '@/lib/giftcards/types'

type ScanResponse = ScanResult & { cached: boolean; safetyRules: string[] }

const EFFORT_LABELS: Record<EffortLevel, string> = {
  passive: 'Passive',
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
}

const EFFORT_COLORS: Record<EffortLevel, string> = {
  passive: 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/30',
  low: 'bg-sky-500/20 text-sky-300 ring-sky-400/30',
  medium: 'bg-amber-500/20 text-amber-300 ring-amber-400/30',
  high: 'bg-rose-500/20 text-rose-300 ring-rose-400/30',
}

export default function GiftCardFinderPage() {
  const [region, setRegion] = useState('US')
  const [maxEffort, setMaxEffort] = useState<EffortLevel | ''>('')
  const [noPurchaseOnly, setNoPurchaseOnly] = useState(false)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runScan = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (region) params.set('region', region)
      if (maxEffort) params.set('maxEffort', maxEffort)
      if (noPurchaseOnly) params.set('noPurchaseOnly', 'true')

      const response = await fetch(`/api/giftcards/scan?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Scan failed')
        return
      }
      setResult(data as ScanResponse)
    } catch {
      setError('Could not reach the scanner. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12">
      <Navigation />
      <div className="mx-auto max-w-5xl px-6 pt-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
              Gift Card Finder
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-purple-200">
            Scans real reward programs and deal feeds for legitimate ways to earn gift cards, then
            filters out the generator scams that dominate these search results.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-10 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-purple-200">Country</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="mt-1 w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-yellow-400"
              >
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="">Anywhere</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-purple-200">Maximum effort</span>
              <select
                value={maxEffort}
                onChange={(event) => setMaxEffort(event.target.value as EffortLevel | '')}
                className="mt-1 w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Any</option>
                <option value="passive">Passive only</option>
                <option value="low">Low or less</option>
                <option value="medium">Medium or less</option>
              </select>
            </label>

            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={noPurchaseOnly}
                onChange={(event) => setNoPurchaseOnly(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-yellow-400 focus:ring-yellow-400"
              />
              <span className="text-sm font-medium text-purple-200">No purchase required</span>
            </label>
          </div>

          <button
            onClick={runScan}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 font-semibold text-black transition-all hover:from-yellow-300 hover:to-orange-400 disabled:opacity-60"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Scanning sources…
              </>
            ) : (
              <>
                <GiftIcon className="h-5 w-5" />
                Scan for gift cards
              </>
            )}
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div className="mt-10 space-y-10">
            <ScanSummary result={result} />

            <section>
              <h2 className="text-2xl font-bold text-white">Standing programs</h2>
              <p className="mt-1 text-sm text-purple-300">
                Ranked by what you actually clear for the effort involved, not by headline claims.
              </p>
              <div className="mt-6 space-y-4">
                {result.programs.map((program) => (
                  <ProgramCard key={program.source.id} program={program} />
                ))}
              </div>
            </section>

            {result.offers.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white">Current offers</h2>
                <p className="mt-1 text-sm text-purple-300">
                  Time-sensitive promotions pulled from deal feeds. Verify terms before acting.
                </p>
                <div className="mt-6 space-y-3">
                  {result.offers.map((offer) => (
                    <OfferCard key={`${offer.sourceId}-${offer.url}-${offer.title}`} offer={offer} />
                  ))}
                </div>
              </section>
            )}

            {result.blocked.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                  <ShieldExclamationIcon className="h-6 w-6 text-red-400" />
                  Filtered as likely scams ({result.blocked.length})
                </h2>
                <div className="mt-4 space-y-2">
                  {result.blocked.slice(0, 10).map((entry, index) => (
                    <div
                      key={`${entry.url}-${index}`}
                      className="rounded-lg bg-red-500/5 px-4 py-3 ring-1 ring-red-400/20"
                    >
                      <p className="text-sm font-medium text-red-200">{entry.title}</p>
                      <p className="mt-1 text-xs text-red-300/80">{entry.reasons.join(' · ')}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(result.unreachable.length > 0 || result.warnings.length > 0) && (
              <section className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                  Coverage notes
                </h2>
                <ul className="mt-3 space-y-1 text-sm text-purple-300">
                  {result.warnings.map((warning) => (
                    <li key={warning}>· {warning}</li>
                  ))}
                  {result.unreachable.map((entry, index) => (
                    <li key={`${entry.id}-${index}`}>
                      · {entry.name} was unreachable ({entry.error})
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl bg-emerald-500/5 p-6 ring-1 ring-emerald-400/20">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-400" />
                Staying out of trouble
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-emerald-100/90">
                {result.safetyRules.map((rule) => (
                  <li key={rule}>· {rule}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function ScanSummary({ result }: { result: ScanResponse }) {
  const { stats } = result
  const items = [
    { label: 'Sources checked', value: stats.sourcesConsidered },
    { label: 'Reachable', value: stats.sourcesFetched },
    { label: 'Offers found', value: stats.offersFound },
    { label: 'Scams filtered', value: stats.offersBlocked },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10">
          <p className="text-2xl font-bold text-white">{item.value}</p>
          <p className="mt-1 text-xs text-purple-300">{item.label}</p>
        </div>
      ))}
      <p className="col-span-2 text-xs text-purple-400 sm:col-span-4">
        Scanned {new Date(result.scannedAt).toLocaleString()} in{' '}
        {(stats.durationMs / 1000).toFixed(1)}s{result.cached && ' · served from a recent scan'}
      </p>
    </div>
  )
}

function ProgramCard({ program }: { program: ProgramResult }) {
  const { source, liveness, risk } = program
  const [low, high] = source.monthlyValueUsd
  const value = low === 0 && high === 0 ? 'Varies' : `$${low}–${high}/mo`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-colors hover:ring-white/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-lg font-semibold text-white hover:text-yellow-400"
          >
            {source.name}
          </a>
          <p className="mt-1 text-sm text-purple-300">
            {value} · {source.brands.slice(0, 4).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${EFFORT_COLORS[source.effort]}`}>
            {EFFORT_LABELS[source.effort]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {program.score}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-purple-200">{source.notes}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Tag>{source.requiresPurchase ? 'Purchase required' : 'No purchase needed'}</Tag>
        {source.payoutThresholdUsd !== undefined && (
          <Tag>Cash out at ${source.payoutThresholdUsd}</Tag>
        )}
        <Tag tone={liveness.ok ? 'ok' : 'warn'}>
          {liveness.ok ? 'Verified reachable' : `Unverified: ${liveness.error ?? 'unknown'}`}
        </Tag>
        {risk.level !== 'clean' && <Tag tone="warn">Risk: {risk.reasons[0]}</Tag>}
      </div>
    </motion.div>
  )
}

function OfferCard({ offer }: { offer: OfferResult }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-white hover:text-yellow-400"
        >
          {offer.title}
        </a>
        {offer.valueUsd !== undefined && (
          <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
            ${offer.valueUsd}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-purple-400">{offer.sourceName}</p>
      {offer.risk.level === 'caution' && (
        <p className="mt-2 text-xs text-amber-300">⚠ {offer.risk.reasons.join(' · ')}</p>
      )}
    </div>
  )
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' }) {
  const tones = {
    neutral: 'bg-white/10 text-purple-200',
    ok: 'bg-emerald-500/15 text-emerald-300',
    warn: 'bg-amber-500/15 text-amber-300',
  }
  return <span className={`rounded-full px-3 py-1 ${tones[tone]}`}>{children}</span>
}
