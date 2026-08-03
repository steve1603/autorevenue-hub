import type { Metadata } from 'next'
import './ctf.css'
import './scenes.css'

export const metadata: Metadata = {
  title: 'The Brasshaven Files -- a steampunk noir CTF',
  description:
    'A beginner capture-the-flag adventure: five gaslamp-noir cases teaching encoding, web reconnaissance, classical ciphers, hash cracking and SQL injection. Everything runs in your browser.',
}

export default function CtfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
