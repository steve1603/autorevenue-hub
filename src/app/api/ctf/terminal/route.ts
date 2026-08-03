import { NextResponse } from 'next/server'
import { hostByName } from '@/lib/ctf/server/hosts'

export const dynamic = 'force-dynamic'

/**
 * Runs one terminal command against a virtual host.
 *
 * The command interpreter lives here rather than in the browser because the
 * filesystems contain flags. A player has to actually find the disallowed path
 * and read it; there is no copy in the bundle to grep.
 */

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

interface Line {
  text: string
  tone: 'out' | 'err' | 'note'
}

const out = (text: string): Line[] => text.split('\n').map((t) => ({ text: t, tone: 'out' as const }))
const err = (text: string): Line[] => [{ text, tone: 'err' }]

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const { host, command } = (body ?? {}) as { host?: unknown; command?: unknown }
  if (typeof host !== 'string' || typeof command !== 'string') {
    return NextResponse.json({ error: 'Send a host and a command.' }, { status: 400 })
  }
  if (command.length > 200) {
    return NextResponse.json({ lines: err('That command is too long for the tube.') })
  }

  const target = hostByName(host)
  if (!target) {
    return NextResponse.json({ lines: err(`Could not reach ${host}.`) })
  }

  const { files, headers } = target
  const [verb, ...args] = command.trim().split(/\s+/)

  /** Accepts `robots.txt`, `/robots.txt`, and `dir/file` for `/dir/file`. */
  const resolve = (arg: string): string | null => {
    const candidates = [arg, arg.replace(/^\.?\//, ''), `/${arg.replace(/^\//, '')}`]
    return candidates.find((c) => c in files) ?? null
  }

  switch (verb) {
    case '':
      return NextResponse.json({ lines: [] })

    case 'help':
      return NextResponse.json({ lines: out(HELP) })

    case 'clear':
      return NextResponse.json({ lines: [], clear: true })

    case 'whoami':
      return NextResponse.json({
        lines: out('visitor -- unauthenticated, and not as anonymous as you think'),
      })

    case 'pwd':
      return NextResponse.json({ lines: out('/') })

    case 'ls': {
      const path = args[0]
      if (!path || path === '.' || path === '/') {
        const top = Object.keys(files).filter((f) => !f.startsWith('/'))
        return NextResponse.json({ lines: out(top.join('\n') || '(nothing published)') })
      }
      const prefix = `/${path.replace(/^\//, '').replace(/\/?$/, '/')}`
      const inside = Object.keys(files)
        .filter((f) => f.startsWith(prefix) && f !== prefix)
        .map((f) => f.slice(prefix.length))
      if (inside.length > 0) return NextResponse.json({ lines: out(inside.join('\n')) })
      if (Object.keys(files).some((f) => f.startsWith(prefix))) {
        return NextResponse.json({ lines: out('(the corridor is empty)') })
      }
      return NextResponse.json({ lines: err(`ls: ${path}: no such corridor`) })
    }

    case 'cat': {
      if (args.length === 0) {
        return NextResponse.json({ lines: err('cat: which file? Try: cat robots.txt') })
      }
      const key = resolve(args[0])
      if (key === null) return NextResponse.json({ lines: err(`cat: ${args[0]}: no such file`) })
      if (key.endsWith('/')) {
        return NextResponse.json({
          lines: err(`cat: ${args[0]}: that is a corridor, not a file. Try ls.`),
        })
      }
      return NextResponse.json({ lines: out(files[key]) })
    }

    case 'curl': {
      const headOnly = args.some((a) => a === '-I' || a === '--head')
      if (headOnly) {
        const block = headers
          ? Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')
          : 'Server: AetherTube/2.14 (Brasshaven)'
        return NextResponse.json({ lines: out(`HTTP/1.1 200 OK\n${block}`) })
      }
      return NextResponse.json({
        lines: [
          ...out(files['index.html'] ?? '(no body returned)'),
          { text: 'Nothing useful in the body. A response has more than a body.', tone: 'note' as const },
        ],
      })
    }

    default:
      return NextResponse.json({ lines: err(`${verb}: command not found. Type "help".`) })
  }
}
