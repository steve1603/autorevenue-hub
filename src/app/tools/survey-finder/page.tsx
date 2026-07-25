'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'
import type {
  OpportunityResult,
  PanelKind,
  PanelResult,
  ScanResult,
} from '@/lib/surveys/types'

type ScanResponse = ScanResult & {
  cached: boolean
  safetyRules: string[]
  dataVintage: string
}

const KIND_LABELS: Record<PanelKind, string> = {
  'research-study': 'Paid study',
  'survey-panel': 'Survey panel',
  'gpt-router': 'Router / offers',
  microtask: 'Microtask',
}

const KIND_COLORS: Record<PanelKind, string> = {
  'research-study': 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/30',
  'survey-panel': 'bg-sky-500/20 text-sky-300 ring-sky-400/30',
  'gpt-router': 'bg-amber-500/20 text-amber-300 ring-amber-400/30',
  microtask: 'bg-purple-500/20 text-purple-300 ring-purple-400/30',
}

export default function SurveyFinderPage() {
  const [region, setRegion] = useState('US')
  const [targetUsd, setTargetUsd] = useState('25')
  const [minHourlyUsd, setMinHourlyUsd] = useState('')
  const [excludeInviteOnly, setExcludeInviteOnly] = useState(false)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runScan = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (region) params.set('region', region)
      if (targetUsd) params.set('targetUsd', targetUsd)
      if (minHourlyUsd) params.set('minHourlyUsd', minHourlyUsd)
      if (excludeInviteOnly) params.set('excludeInviteOnly', 'true')

      const response = await fetch(`/api/surveys/scan?${params.toString()}`)
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
              Survey Finder
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-purple-200">
            Ranks survey panels and paid studies by what they actually pay per hour once
            screen-outs are priced in — then works out how long a gift card really takes.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-10 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-4">
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
              <span className="text-sm font-medium text-purple-200">Card target ($)</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={targetUsd}
                onChange={(event) => setTargetUsd(event.target.value)}
                className="mt-1 w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 focus:ring-2 focus:ring-yellow-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-purple-200">Min $/hour</span>
              <input
                type="number"
                min={0}
                max={1000}
                placeholder="any"
                value={minHourlyUsd}
                onChange={(event) => setMinHourlyUsd(event.target.value)}
                className="mt-1 w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-white placeholder-purple-400 ring-1 ring-white/20 focus:ring-2 focus:ring-yellow-400"
              />
            </label>

            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={excludeInviteOnly}
                onChange={(event) => setExcludeInviteOnly(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-yellow-400 focus:ring-yellow-400"
              />
              <span className="text-sm font-medium text-purple-200">Skip invite-only</span>
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
                Checking platforms…
              </>
            ) : (
              <>
                <ClipboardDocumentCheckIcon className="h-5 w-5" />
                Find surveys worth my time
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
              <h2 className="text-2xl font-bold text-white">Platforms, best first</h2>
              <p className="mt-1 text-sm text-purple-300">
                Ranked on real hourly rate and how much work each one actually offers. A great
                rate on two surveys a week is not income.
              </p>
              <div className="mt-6 space-y-4">
                {result.panels.map((entry) => (
                  <PanelCard key={entry.panel.id} entry={entry} />
                ))}
              </div>
            </section>

            {result.opportunities.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white">Open studies right now</h2>
                <p className="mt-1 text-sm text-purple-300">
                  Individual listings found while crawling. These fill fast.
                </p>
                <div className="mt-6 space-y-3">
                  {result.opportunities.map((item) => (
                    <OpportunityCard key={`${item.panelId}-${item.url}-${item.title}`} item={item} />
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

            {(result.robotsBlocked.length > 0 ||
              result.failed.length > 0 ||
              result.warnings.length > 0) && (
              <section className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                  Coverage notes
                </h2>
                <ul className="mt-3 space-y-1 text-sm text-purple-300">
                  {result.warnings.map((warning) => (
                    <li key={warning}>· {warning}</li>
                  ))}
                  {result.robotsBlocked.length > 0 && (
                    <li>
                      · Not checked because the site asks crawlers to stay out (the platforms are
                      fine): {result.robotsBlocked.map((entry) => entry.name).join(', ')}
                    </li>
                  )}
                  {result.failed.map((entry, index) => (
                    <li key={`${entry.id}-${index}`}>
                      · {entry.name} could not be reached ({entry.error})
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

            <p className="pb-8 text-xs text-purple-400">
              Rates are estimates calibrated {result.dataVintage}. Screen-out rates in particular
              vary a lot by demographic — tune <code>src/lib/surveys/panels.ts</code> against your
              own results.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ScanSummary({ result }: { result: ScanResponse }) {
  const { stats } = result
  const items = [
    { label: 'Platforms ranked', value: stats.panelsConsidered },
    { label: 'Reachable', value: stats.panelsReachable },
    { label: 'Open studies', value: stats.opportunitiesFound },
    { label: 'Scams filtered', value: stats.opportunitiesBlocked },
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

function PanelCard({ entry }: { entry: PanelResult }) {
  const { panel, economics, plan, liveness, risk } = entry

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
            href={panel.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-lg font-semibold text-white hover:text-yellow-400"
          >
            {panel.name}
          </a>
          <p className="mt-1 text-sm text-purple-300">
            Pays in {panel.giftCards.join(', ') || 'n/a'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${KIND_COLORS[panel.kind]}`}>
            {KIND_LABELS[panel.kind]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {entry.score}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Real hourly"
          value={`$${economics.effectiveHourlyUsd.toFixed(2)}`}
          sub={`vs $${economics.nominalHourlyUsd.toFixed(2)} advertised`}
        />
        <Stat
          label="Per week"
          value={`$${economics.realisticWeeklyUsd.toFixed(2)}`}
          sub={`~${panel.typicalSurveysPerWeek} surveys available`}
        />
        <Stat
          label="Screened out"
          value={`${Math.round(panel.screenOutRate * 100)}%`}
          sub={`$${economics.usdPerSurvey.toFixed(2)} per survey`}
        />
      </div>

      {plan && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200 ring-1 ring-yellow-400/20">
          <ClockIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {plan.reachable ? (
            <span>
              To ${plan.targetUsd}: about {plan.surveysNeeded} surveys —{' '}
              {plan.hoursNeeded.toFixed(1)} hours of work, roughly{' '}
              {plan.weeksNeeded > 52 ? 'over a year' : `${plan.weeksNeeded.toFixed(1)} weeks`} at
              this platform&apos;s volume.
            </span>
          ) : (
            <span>
              To ${plan.targetUsd}: not directly — {plan.blockedReason}.
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-purple-200">{panel.notes}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Tag>Cash out at ${panel.minCashoutUsd}</Tag>
        <Tag>Pays {panel.payoutSpeed}</Tag>
        {panel.inviteOnly && <Tag tone="warn">Invite only</Tag>}
        {panel.mobileOnly && <Tag>Phone only</Tag>}
        <Tag tone={liveness.ok ? 'ok' : 'warn'}>
          {liveness.ok ? 'Verified reachable' : `Unverified: ${liveness.error ?? 'unknown'}`}
        </Tag>
        {risk.level !== 'clean' && <Tag tone="warn">Risk: {risk.reasons[0]}</Tag>}
      </div>
    </motion.div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-4 py-3">
      <p className="text-xs text-purple-400">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-purple-400">{sub}</p>
    </div>
  )
}

function OpportunityCard({ item }: { item: OpportunityResult }) {
  const bits = [
    item.payoutUsd !== undefined ? `$${item.payoutUsd}` : null,
    item.minutes !== undefined ? `${item.minutes} min` : null,
  ].filter(Boolean)

  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-white hover:text-yellow-400"
        >
          {item.title}
        </a>
        {bits.length > 0 && (
          <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
            {bits.join(' · ')}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-purple-400">{item.panelName}</p>
      {item.risk.level === 'caution' && (
        <p className="mt-2 text-xs text-amber-300">⚠ {item.risk.reasons.join(' · ')}</p>
      )}
    </div>
  )
}

function Tag({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'ok' | 'warn'
}) {
  const tones = {
    neutral: 'bg-white/10 text-purple-200',
    ok: 'bg-emerald-500/15 text-emerald-300',
    warn: 'bg-amber-500/15 text-amber-300',
  }
  return <span className={`rounded-full px-3 py-1 ${tones[tone]}`}>{children}</span>
}
