'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import {
  caesarBruteForce,
  caesarShift,
  decodeBase64,
  decodeBinary,
  decodeHex,
  decodeMorse,
  encodeBase64,
  encodeBinary,
  encodeHex,
  encodeMorse,
  sha256Hex,
  vigenereDecode,
  vigenereEncode,
  xorBruteForce,
  decodeBase32,
  encodeBase32,
  repeatingXor,
  keysizeScores,
  solveRepeatingXor,
  revealZeroWidth,
  letterFrequency,
  breakRsa,
} from '@/lib/ctf/ciphers'
import type { ToolId } from '@/lib/ctf/cases'

const TOOLS: { id: ToolId; label: string; blurb: string }[] = [
  { id: 'base64', label: 'Base64', blurb: 'Text hiding as safe printable characters. Ends in "=" or "==".' },
  { id: 'hex', label: 'Hex', blurb: 'Pairs of 0-9 and a-f. One pair is one byte.' },
  { id: 'binary', label: 'Binary', blurb: 'Groups of eight ones and zeroes. One group is one character.' },
  { id: 'caesar', label: 'Caesar', blurb: 'Every letter shifted by the same amount. Only 25 keys exist.' },
  { id: 'vigenere', label: 'Vigenère', blurb: 'A Caesar shift that cycles through a keyword.' },
  { id: 'morse', label: 'Morse', blurb: 'Dots and dashes. Space between letters, "/" between words.' },
  { id: 'xor', label: 'XOR', blurb: 'Each byte combined with a key byte. Reversible with the same key.' },
  { id: 'sha256', label: 'SHA-256', blurb: 'One-way fingerprint. Cannot be reversed -- only guessed at.' },
  { id: 'base32', label: 'Base32', blurb: 'A-Z and 2-7 only. Five bits per character, so the padding runs long.' },
  { id: 'rkxor', label: 'Repeating XOR', blurb: 'XOR hex against a text key that cycles. Also does the crib drag.' },
  { id: 'keysize', label: 'Keysize', blurb: 'Scores candidate key lengths by Hamming distance. Lowest wins.' },
  { id: 'zerowidth', label: 'Zero-Width', blurb: 'Pulls invisible U+200B / U+200C characters out of a cover text.' },
  { id: 'frequency', label: 'Frequency', blurb: 'Letter counts, for breaking a substitution by hand.' },
  { id: 'rsa', label: 'RSA', blurb: 'Factors a toy modulus, derives d, and decrypts the blocks.' },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
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

function Output({ value, error }: { value: string; error: string | null }) {
  if (error) {
    return (
      <div className="cipher-block" style={{ color: '#d98b76', borderColor: 'rgba(160,58,38,0.5)' }}>
        {error}
      </div>
    )
  }
  return (
    <div className="cipher-block whitespace-pre-wrap" style={{ color: '#e9dcc3', minHeight: '3.5rem' }}>
      {value || <span className="opacity-40">The engine is idle.</span>}
    </div>
  )
}

/** Runs a decoder and turns any thrown message into displayable text. */
function useSafe<T>(fn: () => T, deps: unknown[]): { value: T | null; error: string | null } {
  return useMemo(() => {
    try {
      return { value: fn(), error: null }
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'The engine jammed.' }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function SimplePane({
  input,
  setInput,
  decode,
  encode,
  placeholder,
}: {
  input: string
  setInput: (v: string) => void
  decode: (s: string) => string
  encode: (s: string) => string
  placeholder: string
}) {
  const [mode, setMode] = useState<'decode' | 'encode'>('decode')
  const { value, error } = useSafe(
    () => (input.trim() ? (mode === 'decode' ? decode(input) : encode(input)) : ''),
    [input, mode],
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['decode', 'encode'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="btn-ghost"
            style={mode === m ? { background: 'rgba(209,169,66,0.22)', color: '#e9dcc3' } : undefined}
          >
            {m}
          </button>
        ))}
      </div>
      <textarea
        className="field ctf-scroll"
        rows={5}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between">
        <span className="stencil">Result</span>
        <CopyButton value={value ?? ''} />
      </div>
      <Output value={value ?? ''} error={error} />
    </div>
  )
}

function CaesarPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const [shift, setShift] = useState(13)
  const rows = useMemo(() => (input.trim() ? caesarBruteForce(input) : []), [input])

  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the shifted text here."
      />

      <div className="flex items-center gap-3">
        <span className="stencil whitespace-nowrap">Shift {shift}</span>
        <input
          type="range"
          min={1}
          max={25}
          value={shift}
          onChange={(e) => setShift(Number(e.target.value))}
          className="w-full accent-[#d1a942]"
          aria-label="Caesar shift amount"
        />
      </div>
      <Output value={input.trim() ? caesarShift(input, shift) : ''} error={null} />

      {rows.length > 0 && (
        <>
          <p className="stencil pt-2">All 25 shifts -- find the row that reads as English</p>
          <div className="ctf-scroll max-h-64 overflow-y-auto rounded-sm border border-[rgba(209,169,66,0.2)]">
            {rows.map((row) => (
              <button
                key={row.shift}
                type="button"
                onClick={() => setShift(row.shift)}
                className="flex w-full gap-3 border-b border-[rgba(209,169,66,0.1)] px-3 py-1.5 text-left last:border-0 hover:bg-[rgba(209,169,66,0.1)]"
                style={row.shift === shift ? { background: 'rgba(209,169,66,0.14)' } : undefined}
              >
                <span className="shrink-0 font-mono text-[0.7rem] text-[#8f7330]">
                  {String(row.shift).padStart(2, '0')}
                </span>
                <span className="truncate font-mono text-[0.72rem] text-[#cbb98f]">{row.text}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function VigenerePane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const [key, setKey] = useState('')
  const [mode, setMode] = useState<'decode' | 'encode'>('decode')
  const { value, error } = useSafe(
    () =>
      input.trim() && key.trim()
        ? mode === 'decode'
          ? vigenereDecode(input, key)
          : vigenereEncode(input, key)
        : '',
    [input, key, mode],
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['decode', 'encode'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="btn-ghost"
            style={mode === m ? { background: 'rgba(209,169,66,0.22)', color: '#e9dcc3' } : undefined}
          >
            {m}
          </button>
        ))}
      </div>
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the ciphertext here."
      />
      <input
        className="field"
        spellCheck={false}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Keyword (letters only, e.g. COGWHEEL)"
      />
      <div className="flex items-center justify-between">
        <span className="stencil">Result</span>
        <CopyButton value={value ?? ''} />
      </div>
      <Output value={value ?? ''} error={key.trim() ? error : null} />
    </div>
  )
}

function XorPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const [brute, setBrute] = useState(false)
  const { value: results, error } = useSafe(
    () => (brute && input.trim() ? xorBruteForce(input) : []),
    [brute, input],
  )

  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setBrute(false)
        }}
        placeholder="Paste the hex bytes here, e.g. 7c 4b 5f"
      />
      <button type="button" className="btn-brass w-full" onClick={() => setBrute(true)} disabled={!input.trim()}>
        Try all 256 keys
      </button>

      {error && <Output value="" error={error} />}

      {brute && !error && (
        <>
          <p className="stencil">
            {results && results.length > 0
              ? `${results.length} key(s) produced readable text`
              : 'No key produced readable text -- check the hex'}
          </p>
          <div className="ctf-scroll max-h-72 space-y-2 overflow-y-auto">
            {results?.map((r) => (
              <div key={r.key} className="cipher-block" style={{ padding: '0.6rem 0.75rem' }}>
                <span className="mr-2 text-[#8f7330]">
                  key 0x{r.key.toString(16).padStart(2, '0')}
                </span>
                <span style={{ color: '#e9dcc3' }}>{r.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function HashPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const digest = input ? sha256Hex(input) : ''
  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a guess -- a name, a word, a password."
      />
      <div className="flex items-center justify-between">
        <span className="stencil">SHA-256</span>
        <CopyButton value={digest} />
      </div>
      <Output value={digest} error={null} />
      <p className="text-xs leading-relaxed text-[#b9ab92]">
        A hash only goes one way. To find the input behind a hash you must guess an input, hash it,
        and compare -- which is exactly what password cracking is.
      </p>
    </div>
  )
}


function RepeatingXorPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const [key, setKey] = useState('')
  const [size, setSize] = useState(0)
  const { value, error } = useSafe(
    () => (input.trim() && key ? repeatingXor(input, key) : ''),
    [input, key],
  )
  const solved = useSafe(
    () => (input.trim() && size > 0 ? solveRepeatingXor(input, size) : null),
    [input, size],
  )

  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the hex bytes here."
      />
      <input
        className="field"
        spellCheck={false}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Key text, e.g. MERIDIAN (or a crib to drag)"
      />
      <div className="flex items-center justify-between">
        <span className="stencil">Result</span>
        <CopyButton value={value ?? ''} />
      </div>
      <Output value={value ?? ''} error={key ? error : null} />

      <div className="flex items-center gap-3 pt-2">
        <span className="stencil whitespace-nowrap">Recover key of length</span>
        <input
          type="number"
          min={0}
          max={40}
          value={size || ''}
          onChange={(e) => setSize(Number(e.target.value))}
          className="field"
          style={{ width: '5rem' }}
          aria-label="Key length to solve for"
        />
      </div>
      {solved.value && (
        <>
          <p className="stencil">Recovered key: {JSON.stringify(solved.value.key)}</p>
          <Output value={solved.value.text} error={null} />
        </>
      )}
      {size > 0 && solved.error && <Output value="" error={solved.error} />}
    </div>
  )
}

function KeysizePane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const { value, error } = useSafe(() => (input.trim() ? keysizeScores(input) : []), [input])
  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the hex ciphertext here."
      />
      {error && <Output value="" error={error} />}
      {value && value.length > 0 && (
        <>
          <p className="stencil">Normalised Hamming distance -- lowest is the likeliest key length</p>
          <div className="ctf-scroll max-h-64 overflow-y-auto rounded-sm border border-[rgba(209,169,66,0.2)]">
            {value.slice(0, 12).map((row, i) => (
              <div
                key={row.size}
                className="flex items-center gap-3 border-b border-[rgba(209,169,66,0.1)] px-3 py-1.5 last:border-0"
                style={i === 0 ? { background: 'rgba(209,169,66,0.14)' } : undefined}
              >
                <span className="w-10 font-mono text-xs text-[#8f7330]">{row.size}</span>
                <span className="font-mono text-xs" style={{ color: i === 0 ? '#d1a942' : '#cbb98f' }}>
                  {row.score.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs italic text-[#b9ab92]">
            Multiples of the true length score well too -- try the smallest strong candidate first.
          </p>
        </>
      )}
    </div>
  )
}

function ZeroWidthPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const { value } = useSafe(() => (input ? revealZeroWidth(input) : null), [input])
  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={5}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the suspect text here, invisible characters and all."
      />
      {value && (
        <>
          <p className="stencil">
            {value.bits} hidden bits found in {value.visible.length} visible characters
          </p>
          <Output value={value.hidden} error={null} />
        </>
      )}
    </div>
  )
}

function FrequencyPane({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const rows = useMemo(() => (input.trim() ? letterFrequency(input) : []), [input])
  return (
    <div className="space-y-3">
      <textarea
        className="field ctf-scroll"
        rows={5}
        spellCheck={false}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste the cryptogram here."
      />
      {rows.length > 0 && (
        <>
          <p className="stencil">English order runs roughly E T A O I N S H R D L U</p>
          <div className="ctf-scroll max-h-64 overflow-y-auto rounded-sm border border-[rgba(209,169,66,0.2)]">
            {rows.map((row) => (
              <div
                key={row.letter}
                className="flex items-center gap-3 border-b border-[rgba(209,169,66,0.1)] px-3 py-1 last:border-0"
              >
                <span className="w-6 font-mono text-xs text-[#d1a942]">{row.letter}</span>
                <span className="w-12 font-mono text-[0.7rem] text-[#8f7330]">{row.pct}%</span>
                <span
                  className="h-2 rounded-sm"
                  style={{ width: `${Math.min(row.pct * 6, 100)}%`, background: '#8f7330' }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RsaPane() {
  const [n, setN] = useState('')
  const [e, setE] = useState('65537')
  const [blocks, setBlocks] = useState('')
  const { value, error } = useSafe(
    () =>
      n.trim() && blocks.trim()
        ? breakRsa(n, e, blocks.split(/[\s,]+/).filter(Boolean))
        : null,
    [n, e, blocks],
  )

  return (
    <div className="space-y-3">
      <input className="field" value={n} onChange={(ev) => setN(ev.target.value)} placeholder="n (modulus)" spellCheck={false} />
      <input className="field" value={e} onChange={(ev) => setE(ev.target.value)} placeholder="e (public exponent)" spellCheck={false} />
      <textarea
        className="field ctf-scroll"
        rows={4}
        spellCheck={false}
        value={blocks}
        onChange={(ev) => setBlocks(ev.target.value)}
        placeholder="Ciphertext blocks, one per line"
      />
      {error && <Output value="" error={error} />}
      {value && (
        <>
          <p className="stencil">
            p = {value.p} · q = {value.q}
          </p>
          <p className="stencil break-all">d = {value.d}</p>
          <div className="flex items-center justify-between">
            <span className="stencil">Plaintext</span>
            <CopyButton value={value.text} />
          </div>
          <Output value={value.text} error={null} />
        </>
      )}
    </div>
  )
}

export default function DifferenceEngine({
  open,
  onClose,
  initialTool,
}: {
  open: boolean
  onClose: () => void
  initialTool: ToolId | null
}) {
  const [tool, setTool] = useState<ToolId>('base64')
  // Each tool keeps its own scratch text so switching tabs does not lose work.
  const [scratch, setScratch] = useState<Record<ToolId, string>>({
    base64: '', hex: '', binary: '', caesar: '', vigenere: '', morse: '', xor: '', sha256: '',
    base32: '', rkxor: '', zerowidth: '', frequency: '', keysize: '', rsa: '', jwt: '', railfence: '',
  })
  const [lastRequested, setLastRequested] = useState<ToolId | null>(null)

  // A challenge can ask for a specific tool; honour it once per request.
  if (open && initialTool && initialTool !== lastRequested) {
    setLastRequested(initialTool)
    setTool(initialTool)
  }
  if (!open && lastRequested !== null) setLastRequested(null)

  const set = (v: string) => setScratch((s) => ({ ...s, [tool]: v }))
  const input = scratch[tool]
  const active = TOOLS.find((t) => t.id === tool)!

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="brass-panel ctf-scroll fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto"
            role="dialog"
            aria-label="The Difference Engine"
          >
            <header className="sticky top-0 z-10 border-b border-[rgba(209,169,66,0.25)] bg-[#14100c] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="stencil">Agency Issue No. 4</p>
                  <h2 className="display gaslight-title text-xl">The Difference Engine</h2>
                </div>
                <button type="button" onClick={onClose} className="btn-ghost" aria-label="Close the workbench">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTool(t.id)}
                    className="btn-ghost"
                    style={
                      tool === t.id
                        ? { background: 'rgba(209,169,66,0.25)', color: '#e9dcc3', borderColor: '#d1a942' }
                        : undefined
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 space-y-4 px-5 py-5">
              <p className="text-sm italic leading-relaxed text-[#b9ab92]">{active.blurb}</p>

              {tool === 'base64' && (
                <SimplePane input={input} setInput={set} decode={decodeBase64} encode={encodeBase64} placeholder="Paste the Base64 here." />
              )}
              {tool === 'hex' && (
                <SimplePane input={input} setInput={set} decode={decodeHex} encode={encodeHex} placeholder="Paste the hex bytes here." />
              )}
              {tool === 'binary' && (
                <SimplePane input={input} setInput={set} decode={decodeBinary} encode={encodeBinary} placeholder="Paste the ones and zeroes here." />
              )}
              {tool === 'morse' && (
                <SimplePane input={input} setInput={set} decode={decodeMorse} encode={encodeMorse} placeholder="Paste the dots and dashes here." />
              )}
              {tool === 'caesar' && <CaesarPane input={input} setInput={set} />}
              {tool === 'vigenere' && <VigenerePane input={input} setInput={set} />}
              {tool === 'xor' && <XorPane input={input} setInput={set} />}
              {tool === 'sha256' && <HashPane input={input} setInput={set} />}
              {tool === 'base32' && (
                <SimplePane input={input} setInput={set} decode={decodeBase32} encode={encodeBase32} placeholder="Paste the Base32 here." />
              )}
              {tool === 'rkxor' && <RepeatingXorPane input={input} setInput={set} />}
              {tool === 'keysize' && <KeysizePane input={input} setInput={set} />}
              {tool === 'zerowidth' && <ZeroWidthPane input={input} setInput={set} />}
              {tool === 'frequency' && <FrequencyPane input={input} setInput={set} />}
              {tool === 'rsa' && <RsaPane />}
            </div>

            <footer className="border-t border-[rgba(209,169,66,0.2)] px-5 py-3">
              <p className="stencil">Everything runs in your browser. Nothing is sent anywhere.</p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
