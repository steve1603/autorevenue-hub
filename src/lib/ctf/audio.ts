'use client'

/**
 * The Brasshaven score, synthesised.
 *
 * Every note and every effect is generated with the Web Audio API -- there are
 * no audio files to ship, no requests to fail and no licences to worry about.
 * The whole soundtrack costs a few kilobytes of code.
 *
 * Two rules the browser enforces and we should want anyway:
 *   - Nothing plays until the player asks for it. Audio is off by default and
 *     the AudioContext is not even created until the toggle is pressed, since
 *     browsers block audio started outside a user gesture.
 *   - The preference is remembered, so nobody has to mute the site twice.
 */

const STORAGE_KEY = 'brasshaven-files:sound'

export type Cue =
  | 'click'    // a control was pressed
  | 'key'      // a telegraph key / terminal keystroke
  | 'hint'     // the file clerk hands something over
  | 'reject'   // wrong countersign
  | 'solve'    // countersign accepted
  | 'unlock'   // a case opens
  | 'vault'    // the eighth lock retracts
  | 'page'     // moving between views

/** Which room we are in. Shifts the ambient bed without changing the tune. */
export type Mood = 'street' | 'interior' | 'dawn'

/** D natural minor -- the melody only ever uses these. */
const SCALE = [146.83, 164.81, 174.61, 196.0, 220.0, 233.08, 261.63, 293.66]
const ROOT = 73.42 // D2

type Listener = () => void

class BrasshavenAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private padFilter: BiquadFilterNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private voices: AudioScheduledSourceNode[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<Listener>()
  private on = false
  private mood: Mood = 'street'

  /* ------------------------------------------------------------- state api */

  isOn(): boolean {
    return this.on
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** Reads the stored preference. Never starts audio on its own. */
  restore() {
    if (typeof window === 'undefined') return
    try {
      this.on = window.localStorage.getItem(STORAGE_KEY) === 'on'
    } catch {
      this.on = false
    }
    // A stored "on" still needs a gesture before the context will run, so the
    // first click anywhere resumes it.
    if (this.on) {
      const resume = () => {
        this.enable()
        window.removeEventListener('pointerdown', resume)
        window.removeEventListener('keydown', resume)
      }
      window.addEventListener('pointerdown', resume, { once: true })
      window.addEventListener('keydown', resume, { once: true })
    }
    this.emit()
  }

  toggle(): boolean {
    if (this.on) this.disable()
    else this.enable()
    return this.on
  }

  enable() {
    this.on = true
    this.persist()
    this.ensureContext()
    void this.ctx?.resume()
    this.startAmbience()
    this.emit()
  }

  disable() {
    this.on = false
    this.persist()
    this.stopAmbience()
    void this.ctx?.suspend()
    this.emit()
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return
    this.mood = mood
    if (!this.ctx || !this.padFilter) return
    // Interiors are muffled, dawn opens up. A slow sweep so it never jars.
    const cutoff = mood === 'interior' ? 420 : mood === 'dawn' ? 1400 : 800
    this.padFilter.frequency.cancelScheduledValues(this.ctx.currentTime)
    this.padFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 1.5)
  }

  private persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, this.on ? 'on' : 'off')
    } catch {
      // Private browsing: the preference just will not survive a reload.
    }
  }

  /* --------------------------------------------------------------- plumbing */

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null

    const Ctor = window.AudioContext ?? (window as unknown as {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!Ctor) return null

    const ctx = new Ctor()
    this.ctx = ctx

    // Master stays low: this is background, not a feature.
    const master = ctx.createGain()
    master.gain.value = 0.62
    // A gentle compressor keeps a cue landing over the pad from ever spiking.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    master.connect(limiter).connect(ctx.destination)
    this.master = master

    const musicBus = ctx.createGain()
    musicBus.gain.value = 0
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 800
    padFilter.Q.value = 0.7
    musicBus.connect(padFilter).connect(master)
    this.musicBus = musicBus
    this.padFilter = padFilter

    // One second of noise, reused for rain, clicks and paper.
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer

    return ctx
  }

  /* --------------------------------------------------------------- ambience */

  private startAmbience() {
    const ctx = this.ensureContext()
    if (!ctx || !this.musicBus || !this.noiseBuffer || this.voices.length > 0) return

    const now = ctx.currentTime

    // Two detuned oscillators on the root: the drone under the whole city.
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = ROOT
      osc.detune.value = detune
      const gain = ctx.createGain()
      gain.gain.value = 0.055
      osc.connect(gain).connect(this.musicBus)
      osc.start(now)
      this.voices.push(osc)
    }

    // A fifth above, quieter, so the drone is not a dead tone.
    const fifth = ctx.createOscillator()
    fifth.type = 'sine'
    fifth.frequency.value = ROOT * 1.5
    const fifthGain = ctx.createGain()
    fifthGain.gain.value = 0.024
    fifth.connect(fifthGain).connect(this.musicBus)
    fifth.start(now)
    this.voices.push(fifth)

    // Rain: filtered noise, barely there.
    const rain = ctx.createBufferSource()
    rain.buffer = this.noiseBuffer
    rain.loop = true
    const rainFilter = ctx.createBiquadFilter()
    rainFilter.type = 'bandpass'
    rainFilter.frequency.value = 1800
    rainFilter.Q.value = 0.4
    const rainGain = ctx.createGain()
    rainGain.gain.value = 0.012
    rain.connect(rainFilter).connect(rainGain).connect(this.master!)
    rain.start(now)
    this.voices.push(rain)

    // Fade the bed in rather than snapping it on.
    this.musicBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setValueAtTime(0, now)
    this.musicBus.gain.linearRampToValueAtTime(1, now + 2.5)

    this.scheduleMelody()
  }

  /**
   * Sparse, slow, and never in a hurry: a note every few seconds from the scale,
   * so it reads as atmosphere rather than a tune anyone has to listen to.
   */
  private scheduleMelody() {
    const next = 3500 + Math.random() * 5500
    this.timer = setTimeout(() => {
      if (this.on) {
        // Lower notes more often than high ones; the occasional high one is
        // what makes it feel composed rather than random.
        const index = Math.floor(Math.random() ** 1.7 * SCALE.length)
        this.note(SCALE[index], 0.04, 2.6, index > 4 ? 'sine' : 'triangle')
        this.scheduleMelody()
      }
    }, next)
  }

  private stopAmbience() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.ctx || !this.musicBus) return

    const now = this.ctx.currentTime
    this.musicBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now)
    this.musicBus.gain.linearRampToValueAtTime(0, now + 0.6)

    const voices = this.voices
    this.voices = []
    voices.forEach((voice) => {
      try {
        voice.stop(now + 0.7)
      } catch {
        // Already stopped -- nothing to do.
      }
    })
  }

  /* ------------------------------------------------------------------ notes */

  /** One note with a soft envelope. Ramps avoid the click a bare gate makes. */
  private note(
    frequency: number,
    peak: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay = 0,
    destination?: AudioNode,
  ) {
    const ctx = this.ctx
    if (!ctx) return
    const start = ctx.currentTime + delay

    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, start)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(gain).connect(destination ?? this.master!)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }

  /** A short burst of filtered noise: clicks, paper, thuds. */
  private noise(
    peak: number,
    duration: number,
    filter: { type: BiquadFilterType; frequency: number; Q?: number },
    delay = 0,
  ) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const start = ctx.currentTime + delay

    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer
    // Start at a random offset so repeated clicks are not identical.
    const offset = Math.random() * (this.noiseBuffer.duration - duration - 0.01)

    const band = ctx.createBiquadFilter()
    band.type = filter.type
    band.frequency.value = filter.frequency
    band.Q.value = filter.Q ?? 1

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(peak, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    source.connect(band).connect(gain).connect(this.master!)
    source.start(start, Math.max(0, offset), duration + 0.02)
  }

  /**
   * Steps the music back so a cue is heard rather than merely added.
   *
   * Measured without this, the solve chord peaked barely above the pad -- it
   * registered as slightly more noise instead of as a moment.
   */
  private duck(depth: number, hold: number) {
    const ctx = this.ctx
    if (!ctx || !this.musicBus) return
    const now = ctx.currentTime
    const gain = this.musicBus.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(gain.value, now)
    gain.linearRampToValueAtTime(depth, now + 0.06)
    gain.linearRampToValueAtTime(1, now + hold)
  }

  /* ------------------------------------------------------------------- cues */

  cue(name: Cue) {
    if (!this.on) return
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    switch (name) {
      case 'click':
        this.noise(0.06, 0.03, { type: 'bandpass', frequency: 2200, Q: 2 })
        break

      case 'key':
        // A telegraph key: tight, woody, quiet.
        this.noise(0.09, 0.025, { type: 'bandpass', frequency: 3200, Q: 3 })
        this.note(880, 0.02, 0.04, 'square')
        break

      case 'page':
        this.noise(0.05, 0.12, { type: 'lowpass', frequency: 1200 })
        break

      case 'hint':
        // Paper sliding across a desk, then a small brass tap.
        this.noise(0.07, 0.22, { type: 'highpass', frequency: 1600 })
        this.note(SCALE[4], 0.05, 0.5, 'sine', 0.12)
        break

      case 'reject': {
        // A dull, dropping thud. Nothing punishing.
        const ctxTime = ctx.currentTime
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(150, ctxTime)
        osc.frequency.exponentialRampToValueAtTime(70, ctxTime + 0.28)
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.0001, ctxTime)
        gain.gain.exponentialRampToValueAtTime(0.22, ctxTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctxTime + 0.34)
        osc.connect(gain).connect(this.master!)
        osc.start(ctxTime)
        osc.stop(ctxTime + 0.4)
        this.noise(0.05, 0.09, { type: 'lowpass', frequency: 500 })
        break
      }

      case 'solve':
        // A rising minor triad, then the octave: the case closing.
        this.duck(0.35, 1.6)
        this.note(SCALE[0], 0.16, 0.7, 'triangle', 0)
        this.note(SCALE[2], 0.15, 0.7, 'triangle', 0.09)
        this.note(SCALE[4], 0.15, 0.9, 'sine', 0.18)
        this.note(SCALE[7], 0.12, 1.4, 'sine', 0.3)
        break

      case 'unlock':
        // A distant bell over the rooftops.
        this.duck(0.45, 1.8)
        this.note(SCALE[6], 0.14, 1.8, 'sine')
        this.note(SCALE[6] * 2.01, 0.06, 1.4, 'sine', 0.02)
        break

      case 'vault': {
        // Heavy clunk, then metal ringing off in the dark.
        this.duck(0.3, 2.0)
        const t = ctx.currentTime
        const thud = ctx.createOscillator()
        thud.type = 'sine'
        thud.frequency.setValueAtTime(110, t)
        thud.frequency.exponentialRampToValueAtTime(44, t + 0.35)
        const thudGain = ctx.createGain()
        thudGain.gain.setValueAtTime(0.0001, t)
        thudGain.gain.exponentialRampToValueAtTime(0.28, t + 0.01)
        thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
        thud.connect(thudGain).connect(this.master!)
        thud.start(t)
        thud.stop(t + 0.55)

        this.noise(0.16, 0.2, { type: 'lowpass', frequency: 900 })
        this.note(SCALE[3] * 2, 0.09, 2.2, 'sine', 0.12)
        this.note(SCALE[5] * 2, 0.06, 1.8, 'sine', 0.16)
        break
      }
    }
  }
}

/** One engine for the whole app; audio hardware is not worth duplicating. */
export const audio = new BrasshavenAudio()
