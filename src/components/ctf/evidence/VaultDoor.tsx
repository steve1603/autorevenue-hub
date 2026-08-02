'use client'

import { useState } from 'react'

/**
 * A login form that is vulnerable on purpose.
 *
 * The teaching device is the live query preview: the player watches their own
 * typing become part of the query's grammar rather than its data, which is
 * precisely what SQL injection is.
 *
 * The bypass itself is evaluated server-side, so the countersign is only ever
 * sent to someone who actually performed the injection -- it is not sitting in
 * this bundle waiting to be read.
 */
export default function VaultDoor({ host }: { host: string }) {
  const [name, setName] = useState('')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'denied' }
    | { kind: 'error'; detail: string }
    | { kind: 'open'; secret: string; keepers: string[] }
  >({ kind: 'idle' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)

    try {
      const response = await fetch('/api/ctf/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phrase }),
      })
      const data = await response.json()

      if (data.result === 'open') {
        setResult({ kind: 'open', secret: data.secret, keepers: data.keepers ?? [] })
      } else if (data.result === 'fault') {
        setResult({ kind: 'error', detail: data.detail })
      } else {
        setResult({ kind: 'denied' })
      }
    } catch {
      setResult({ kind: 'error', detail: 'The speaking tube is dead -- could not reach the door.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="brass-panel riveted p-5">
        <p className="stencil mb-3">Keeper Challenge -- {host}</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="stencil mb-1 block" htmlFor="vault-name">
              Keeper name
            </label>
            <input
              id="vault-name"
              className="field"
              spellCheck={false}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ignatius rook"
            />
          </div>
          <div>
            <label className="stencil mb-1 block" htmlFor="vault-phrase">
              Passphrase
            </label>
            <input
              id="vault-phrase"
              className="field"
              spellCheck={false}
              autoComplete="off"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="the passphrase you do not have"
            />
          </div>
          <button type="submit" className="btn-brass w-full" disabled={busy}>
            {busy ? 'The door is listening…' : 'Speak to the door'}
          </button>
        </form>
      </div>

      <div>
        <p className="stencil mb-2">The sentence the door is building</p>
        <div className="cipher-block">
          <span style={{ color: '#6f9c8e' }}>SELECT</span> keeper{' '}
          <span style={{ color: '#6f9c8e' }}>FROM</span> register{' '}
          <span style={{ color: '#6f9c8e' }}>WHERE</span> name = &apos;
          <span style={{ color: '#d1a942', fontWeight: 700 }}>{name || '…'}</span>
          &apos; <span style={{ color: '#6f9c8e' }}>AND</span> phrase = &apos;
          <span style={{ color: '#d1a942', fontWeight: 700 }}>{phrase || '…'}</span>
          &apos;;
        </div>
        <p className="mt-2 text-xs italic text-[#b9ab92]">
          Everything in brass is yours. The door cannot tell your words from its own.
        </p>
      </div>

      {result.kind === 'denied' && (
        <div className="cipher-block" style={{ color: '#d98b76', borderColor: 'rgba(160,58,38,0.5)' }}>
          NO MATCH. The door does not move. Guessing the passphrase will take you a very long time.
        </div>
      )}

      {result.kind === 'error' && (
        <div className="cipher-block" style={{ color: '#d98b76', borderColor: 'rgba(160,58,38,0.5)' }}>
          {result.detail}
          <br />
          <span style={{ color: '#b9ab92' }}>
            Interesting. Your apostrophe reached the engine. Now finish the sentence yourself.
          </span>
        </div>
      )}

      {result.kind === 'open' && (
        <div className="paper paper-aged p-5">
          <p className="stencil" style={{ color: '#7a5a1e' }}>
            Register returned {result.keepers.length} rows -- door opens on the first
          </p>
          <ul className="mt-2 space-y-1 font-mono text-sm">
            {result.keepers.map((k, i) => (
              <li key={k} style={{ fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 1 : 0.55 }}>
                {i === 0 ? '▸ ' : '  '}
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[#241a12]/20 pt-3 font-mono text-sm">
            EIGHTH LOCK RETRACTED. Countersign engraved on the inside of the door:
            <br />
            <strong>{result.secret}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
