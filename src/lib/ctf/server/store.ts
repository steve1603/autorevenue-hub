import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

/**
 * Persistence for players, solves and hint usage.
 *
 * Two adapters share one interface: Supabase for real deployments, and an
 * in-process map for local development so the game runs with no setup at all.
 * The in-memory adapter is explicitly not viable in production -- every
 * serverless invocation gets a fresh process, so scores would evaporate.
 */

export interface PlayerRecord {
  id: string
  handle: string
}

export interface SolveRecord {
  challengeId: string
  points: number
  hintsUsed: number
  solvedAt: string
}

export interface LeaderboardEntry {
  handle: string
  score: number
  solves: number
  hintsUsed: number
  /** ISO timestamp of the most recent solve -- used to break score ties. */
  lastSolveAt: string
  firstSolveAt: string
}

export interface CtfStore {
  createPlayer(handle: string): Promise<PlayerRecord | 'handle-taken'>
  getPlayer(id: string): Promise<PlayerRecord | null>
  getSolves(playerId: string): Promise<SolveRecord[]>
  getHintCounts(playerId: string): Promise<Record<string, number>>
  /** Returns the new hint count for that challenge. */
  recordHint(playerId: string, challengeId: string): Promise<number>
  /** No-ops if the challenge is already solved, so points cannot be re-banked. */
  recordSolve(playerId: string, challengeId: string, points: number, hintsUsed: number): Promise<void>
  leaderboard(limit: number): Promise<LeaderboardEntry[]>
  readonly persistent: boolean
}

/* ------------------------------------------------------------------ memory */

interface MemoryPlayer extends PlayerRecord {
  solves: Map<string, SolveRecord>
  hints: Map<string, number>
}

class MemoryStore implements CtfStore {
  readonly persistent = false
  private players = new Map<string, MemoryPlayer>()
  private handles = new Map<string, string>()

  async createPlayer(handle: string): Promise<PlayerRecord | 'handle-taken'> {
    const key = handle.toLowerCase()
    if (this.handles.has(key)) return 'handle-taken'
    const player: MemoryPlayer = { id: randomUUID(), handle, solves: new Map(), hints: new Map() }
    this.players.set(player.id, player)
    this.handles.set(key, player.id)
    return { id: player.id, handle: player.handle }
  }

  async getPlayer(id: string): Promise<PlayerRecord | null> {
    const player = this.players.get(id)
    return player ? { id: player.id, handle: player.handle } : null
  }

  async getSolves(playerId: string): Promise<SolveRecord[]> {
    return [...(this.players.get(playerId)?.solves.values() ?? [])]
  }

  async getHintCounts(playerId: string): Promise<Record<string, number>> {
    return Object.fromEntries(this.players.get(playerId)?.hints ?? [])
  }

  async recordHint(playerId: string, challengeId: string): Promise<number> {
    const player = this.players.get(playerId)
    if (!player) return 0
    const next = (player.hints.get(challengeId) ?? 0) + 1
    player.hints.set(challengeId, next)
    return next
  }

  async recordSolve(playerId: string, challengeId: string, points: number, hintsUsed: number) {
    const player = this.players.get(playerId)
    if (!player || player.solves.has(challengeId)) return
    player.solves.set(challengeId, {
      challengeId,
      points,
      hintsUsed,
      solvedAt: new Date().toISOString(),
    })
  }

  async leaderboard(limit: number): Promise<LeaderboardEntry[]> {
    return [...this.players.values()]
      .map((player) => {
        const solves = [...player.solves.values()]
        const times = solves.map((s) => s.solvedAt).sort()
        return {
          handle: player.handle,
          score: solves.reduce((sum, s) => sum + s.points, 0),
          solves: solves.length,
          hintsUsed: solves.reduce((sum, s) => sum + s.hintsUsed, 0),
          firstSolveAt: times[0] ?? '',
          lastSolveAt: times[times.length - 1] ?? '',
        }
      })
      .filter((entry) => entry.solves > 0)
      .sort((a, b) => b.score - a.score || a.lastSolveAt.localeCompare(b.lastSolveAt))
      .slice(0, limit)
  }
}

/* ---------------------------------------------------------------- supabase */

class SupabaseStore implements CtfStore {
  readonly persistent = true
  constructor(private client: SupabaseClient) {}

  async createPlayer(handle: string): Promise<PlayerRecord | 'handle-taken'> {
    const { data, error } = await this.client
      .from('ctf_players')
      .insert({ handle })
      .select('id, handle')
      .single()

    // 23505 is Postgres' unique_violation -- the handle is already claimed.
    if (error?.code === '23505') return 'handle-taken'
    if (error) throw new Error(`could not create player: ${error.message}`)
    return { id: data.id as string, handle: data.handle as string }
  }

  async getPlayer(id: string): Promise<PlayerRecord | null> {
    const { data, error } = await this.client
      .from('ctf_players')
      .select('id, handle')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null
    return { id: data.id as string, handle: data.handle as string }
  }

  async getSolves(playerId: string): Promise<SolveRecord[]> {
    const { data, error } = await this.client
      .from('ctf_solves')
      .select('challenge_id, points, hints_used, solved_at')
      .eq('player_id', playerId)
    if (error || !data) return []
    return data.map((row) => ({
      challengeId: row.challenge_id as string,
      points: row.points as number,
      hintsUsed: row.hints_used as number,
      solvedAt: row.solved_at as string,
    }))
  }

  async getHintCounts(playerId: string): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from('ctf_hints')
      .select('challenge_id, hints_used')
      .eq('player_id', playerId)
    if (error || !data) return {}
    return Object.fromEntries(data.map((row) => [row.challenge_id as string, row.hints_used as number]))
  }

  async recordHint(playerId: string, challengeId: string): Promise<number> {
    const current = await this.getHintCounts(playerId)
    const next = (current[challengeId] ?? 0) + 1
    const { error } = await this.client
      .from('ctf_hints')
      .upsert(
        { player_id: playerId, challenge_id: challengeId, hints_used: next },
        { onConflict: 'player_id,challenge_id' },
      )
    if (error) throw new Error(`could not record hint: ${error.message}`)
    return next
  }

  async recordSolve(playerId: string, challengeId: string, points: number, hintsUsed: number) {
    // ignoreDuplicates makes a repeat submission a no-op rather than a re-bank.
    const { error } = await this.client
      .from('ctf_solves')
      .upsert(
        { player_id: playerId, challenge_id: challengeId, points, hints_used: hintsUsed },
        { onConflict: 'player_id,challenge_id', ignoreDuplicates: true },
      )
    if (error) throw new Error(`could not record solve: ${error.message}`)
  }

  async leaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('ctf_solves')
      .select('points, hints_used, solved_at, ctf_players!inner(handle)')
    if (error || !data) return []

    const byHandle = new Map<string, LeaderboardEntry>()
    for (const row of data) {
      const joined = row.ctf_players as unknown as { handle: string } | { handle: string }[]
      const handle = Array.isArray(joined) ? joined[0]?.handle : joined?.handle
      if (!handle) continue

      const solvedAt = row.solved_at as string
      const entry = byHandle.get(handle) ?? {
        handle,
        score: 0,
        solves: 0,
        hintsUsed: 0,
        firstSolveAt: solvedAt,
        lastSolveAt: solvedAt,
      }
      entry.score += row.points as number
      entry.solves += 1
      entry.hintsUsed += row.hints_used as number
      if (solvedAt < entry.firstSolveAt) entry.firstSolveAt = solvedAt
      if (solvedAt > entry.lastSolveAt) entry.lastSolveAt = solvedAt
      byHandle.set(handle, entry)
    }

    return [...byHandle.values()]
      .sort((a, b) => b.score - a.score || a.lastSolveAt.localeCompare(b.lastSolveAt))
      .slice(0, limit)
  }
}

/* ----------------------------------------------------------------- factory */

let store: CtfStore | null = null

export function getStore(): CtfStore {
  if (store) return store

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  // The service role key stays server-side. The anon key would be subject to
  // row level security and cannot be trusted to write authoritative scores.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && key) {
    store = new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }))
    return store
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[ctf] Supabase is not configured -- the leaderboard is running in memory and will lose scores on every cold start. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  store = new MemoryStore()
  return store
}
