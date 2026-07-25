'use client'

import { useState } from 'react'
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { Evidence } from '@/lib/ctf/cases'
import { sha256Hex } from '@/lib/ctf/ciphers'
import Terminal from './evidence/Terminal'
import VaultDoor from './evidence/VaultDoor'

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn-ghost inline-flex items-center gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Renders the notice with a genuine HTML comment wrapped around it.
 *
 * React strips comments from JSX, so the only way to put a real one in the DOM
 * -- which is the entire point of the challenge -- is to inject the markup.
 * The content is authored here rather than supplied by a user, and the secret
 * is escaped before it goes in.
 */
function SourceNotice({ body, secret }: { body: string; secret: string }) {
  const html = `<!--
  TYPESETTER'S NOTE -- do not run with the plate in this state.

  Sup. Rook says pull the Dock Nine manifest from the public run.
  Second time this month. What is he shipping?

  Plate countersign for the re-run: ${escapeHtml(secret)}
-->
<pre class="paper paper-aged" style="padding:1.25rem;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.78rem;line-height:1.7;white-space:pre-wrap;">${escapeHtml(body)}</pre>`

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="mt-3 text-xs italic text-[#b9ab92]">
        Right-click this notice → Inspect (or press F12), and read the markup that produced it.
      </p>
    </div>
  )
}

function KeeperRoll({
  names,
  target,
  note,
}: {
  names: string[]
  target: string
  note: string
}) {
  const [hashed, setHashed] = useState(false)

  return (
    <div className="space-y-3">
      <div className="cipher-block">
        <span className="text-[#8f7330]">Register entry for the eighth key:</span>
        <br />
        <span style={{ color: '#e9dcc3' }}>{target}</span>
      </div>
      <p className="text-xs italic text-[#b9ab92]">{note}</p>

      <button type="button" className="btn-brass w-full" onClick={() => setHashed(true)} disabled={hashed}>
        {hashed ? 'Roll hashed' : 'Hash the roll'}
      </button>

      <div className="ctf-scroll max-h-72 overflow-y-auto rounded-sm border border-[rgba(209,169,66,0.2)]">
        {names.map((name) => {
          const digest = hashed ? sha256Hex(name) : null
          const match = digest === target
          return (
            <div
              key={name}
              className="flex flex-col gap-0.5 border-b border-[rgba(209,169,66,0.1)] px-3 py-2 last:border-0"
              style={match ? { background: 'rgba(209,169,66,0.16)' } : undefined}
            >
              <span
                className="font-mono text-xs"
                style={{ color: match ? '#e9dcc3' : '#cbb98f', fontWeight: match ? 700 : 400 }}
              >
                {match ? '▸ ' : '  '}
                {name}
              </span>
              {digest && (
                <span
                  className="break-all font-mono text-[0.65rem]"
                  style={{ color: match ? '#d1a942' : '#6b6152' }}
                >
                  {digest}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {hashed && (
        <p className="text-xs italic text-[#b9ab92]">
          One row matches the register. Twelve guesses took no time at all -- a real wordlist holds
          millions, and a computer does not get bored.
        </p>
      )}
    </div>
  )
}

export default function EvidenceBoard({ evidence }: { evidence: Evidence }) {
  return (
    <section className="space-y-2">
      <header className="flex items-start justify-between gap-3">
        <h4 className="stencil pt-1">{evidence.label}</h4>
        {evidence.kind === 'ciphertext' && <CopyRow value={evidence.body} />}
      </header>

      {evidence.kind === 'document' && (
        <pre className="paper paper-aged whitespace-pre-wrap p-5 font-mono text-[0.78rem] leading-relaxed">
          {evidence.body}
        </pre>
      )}

      {evidence.kind === 'ciphertext' && (
        <>
          <div className="cipher-block">{evidence.body}</div>
          {evidence.note && <p className="text-xs italic text-[#b9ab92]">{evidence.note}</p>}
        </>
      )}

      {evidence.kind === 'source' && <SourceNotice body={evidence.body} secret={evidence.secret} />}

      {evidence.kind === 'terminal' && (
        <Terminal host={evidence.host} files={evidence.files} headers={evidence.headers} />
      )}

      {evidence.kind === 'login' && <VaultDoor host={evidence.host} secret={evidence.secret} />}

      {evidence.kind === 'wordlist' && (
        <KeeperRoll names={evidence.names} target={evidence.target} note={evidence.note} />
      )}
    </section>
  )
}
