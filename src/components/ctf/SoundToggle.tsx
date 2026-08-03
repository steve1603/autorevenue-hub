'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'
import { audio } from '@/lib/ctf/audio'

/**
 * Reads the engine's on/off state.
 *
 * The server snapshot is always `false` so the first paint matches the markup
 * React produced on the server -- the stored preference is applied on mount.
 */
export function useSound() {
  return useSyncExternalStore(
    audio.subscribe,
    () => audio.isOn(),
    () => false,
  )
}

export default function SoundToggle({ className = '' }: { className?: string }) {
  const on = useSound()

  useEffect(() => {
    audio.restore()
  }, [])

  return (
    <button
      type="button"
      onClick={() => audio.toggle()}
      className={`btn-ghost inline-flex items-center gap-1.5 ${className}`}
      aria-pressed={on}
      title={on ? 'Silence the city' : 'Let the city play'}
    >
      {on ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4" />}
      <span className="sr-only">{on ? 'Turn sound off' : 'Turn sound on'}</span>
    </button>
  )
}
