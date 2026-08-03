'use client'

import { useEffect, useRef, useState } from 'react'
import { audio } from '@/lib/ctf/audio'

interface Line {
  text: string
  tone: 'prompt' | 'out' | 'err' | 'note'
}

/**
 * A terminal front-end. The commands actually run on the server.
 *
 * Nothing about the virtual host lives in this bundle -- no filenames, no file
 * contents, no headers. The player has to discover the hidden path the way the
 * challenge intends, and there is no copy of the flag to grep for.
 */
export default function Terminal({ host }: { host: string }) {
  const [lines, setLines] = useState<Line[]>([
    { text: `Pneumatic Post Terminal -- connected to ${host}`, tone: 'note' },
    { text: `Type "help" if you have never done this before.`, tone: 'note' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const run = async (raw: string) => {
    const command = raw.trim()
    setLines((current) => [...current, { text: `visitor@${host}:~$ ${command}`, tone: 'prompt' }])
    if (!command) return

    setBusy(true)
    try {
      const response = await fetch('/api/ctf/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, command }),
      })
      const data = await response.json()

      if (data.clear) {
        setLines([])
        return
      }
      setLines((current) => [...current, ...((data.lines ?? []) as Line[])])
    } catch {
      setLines((current) => [
        ...current,
        { text: 'The tube is blocked -- could not reach the post.', tone: 'err' },
      ])
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (busy) return
      audio.cue('key')
      const submitted = input
      run(submitted)
      if (submitted.trim()) setHistory((h) => [submitted.trim(), ...h])
      setHistoryIndex(-1)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(historyIndex + 1, history.length - 1)
      if (next >= 0) {
        setHistoryIndex(next)
        setInput(history[next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyIndex - 1
      setHistoryIndex(next)
      setInput(next >= 0 ? history[next] : '')
    }
  }

  const toneColour: Record<Line['tone'], string> = {
    prompt: '#d1a942',
    out: '#8fd3bd',
    err: '#d98b76',
    note: '#6f9c8e',
  }

  return (
    <div
      className="terminal-shell cursor-text p-4"
      onClick={() => inputRef.current?.focus()}
      role="group"
      aria-label={`Terminal connected to ${host}`}
    >
      <div ref={scrollRef} className="ctf-scroll max-h-80 min-h-[16rem] overflow-y-auto pr-1">
        {lines.map((line, i) => (
          <pre
            key={i}
            className="whitespace-pre-wrap break-words"
            style={{ color: toneColour[line.tone], fontStyle: line.tone === 'note' ? 'italic' : undefined }}
          >
            {line.text || ' '}
          </pre>
        ))}
        <div className="mt-1 flex items-center gap-2">
          <span className="shrink-0" style={{ color: '#d1a942' }}>
            visitor@{host}:~$
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            aria-label="Terminal command"
            className="flex-1 border-0 bg-transparent p-0 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
