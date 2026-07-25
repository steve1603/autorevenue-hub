'use client'

import { useEffect, useRef, useState } from 'react'

interface Line {
  text: string
  tone: 'prompt' | 'out' | 'err' | 'note'
}

const HELP = `Available commands:

  help              show this list
  ls [path]         list what is published at a path
  cat <file>        read a file
  curl <host>       fetch a page body
  curl -I <host>    fetch ONLY the headers (-I means "head")
  whoami            who the post thinks you are
  clear             wipe the screen

Tip: paths that are not listed by "ls" can still exist.
Something has to tell you they are there.`

/**
 * A deliberately small shell over a fixed set of files and headers.
 *
 * It is not a real filesystem -- it exists to teach `ls`, `cat` and `curl -I`
 * to a player who may never have opened a terminal before, so the error
 * messages matter more than the feature list.
 */
export default function Terminal({
  host,
  files,
  headers,
}: {
  host: string
  files: Record<string, string>
  headers?: Record<string, string>
}) {
  const [lines, setLines] = useState<Line[]>([
    { text: `Pneumatic Post Terminal -- connected to ${host}`, tone: 'note' },
    { text: `Type "help" if you have never done this before.`, tone: 'note' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const push = (newLines: Line[]) => setLines((current) => [...current, ...newLines])
  const out = (text: string): Line[] => text.split('\n').map((t) => ({ text: t, tone: 'out' as const }))

  /** Accepts `robots.txt`, `/robots.txt`, and `dir/file` for `/dir/file`. */
  const resolve = (arg: string): string | null => {
    const candidates = [arg, arg.replace(/^\.?\//, ''), `/${arg.replace(/^\//, '')}`]
    return candidates.find((c) => c in files) ?? null
  }

  const run = (raw: string) => {
    const command = raw.trim()
    push([{ text: `visitor@${host}:~$ ${command}`, tone: 'prompt' }])
    if (!command) return

    const [verb, ...args] = command.split(/\s+/)

    switch (verb) {
      case 'help':
        push(out(HELP))
        break

      case 'clear':
        setLines([])
        break

      case 'whoami':
        push(out('visitor -- unauthenticated, and not as anonymous as you think'))
        break

      case 'pwd':
        push(out('/'))
        break

      case 'ls': {
        const path = args[0]
        if (!path || path === '.' || path === '/') {
          const top = Object.keys(files).filter((f) => !f.startsWith('/'))
          push(out(top.join('\n') || '(nothing published)'))
        } else {
          const prefix = `/${path.replace(/^\//, '').replace(/\/?$/, '/')}`
          const inside = Object.keys(files)
            .filter((f) => f.startsWith(prefix) && f !== prefix)
            .map((f) => f.slice(prefix.length))
          if (inside.length > 0) {
            push(out(inside.join('\n')))
          } else if (Object.keys(files).some((f) => f.startsWith(prefix))) {
            push(out('(the corridor is empty)'))
          } else {
            push([{ text: `ls: ${path}: no such corridor`, tone: 'err' }])
          }
        }
        break
      }

      case 'cat': {
        if (args.length === 0) {
          push([{ text: 'cat: which file? Try: cat robots.txt', tone: 'err' }])
          break
        }
        const key = resolve(args[0])
        if (key === null) {
          push([{ text: `cat: ${args[0]}: no such file`, tone: 'err' }])
        } else if (key.endsWith('/')) {
          push([{ text: `cat: ${args[0]}: that is a corridor, not a file. Try ls.`, tone: 'err' }])
        } else {
          push(out(files[key]))
        }
        break
      }

      case 'curl': {
        const headOnly = args.some((a) => a === '-I' || a === '--head')
        if (headOnly) {
          if (!headers) {
            push(out('HTTP/1.1 200 OK\nServer: AetherTube/2.14 (Brasshaven)'))
          } else {
            push(out(`HTTP/1.1 200 OK\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')}`))
          }
        } else {
          const index = files['index.html']
          push(out(index ?? '(no body returned)'))
          push([{ text: 'Nothing useful in the body. A response has more than a body.', tone: 'note' }])
        }
        break
      }

      default:
        push([{ text: `${verb}: command not found. Type "help".`, tone: 'err' }])
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input)
      if (input.trim()) setHistory((h) => [input.trim(), ...h])
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
