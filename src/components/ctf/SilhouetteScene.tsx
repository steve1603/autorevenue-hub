import type { ReactNode } from 'react'

/**
 * Gaslamp-noir silhouette scenes.
 *
 * Every scene is inline SVG built from a handful of shared primitives, so there
 * are no image assets to ship, no requests to fail, and the whole set costs a
 * few kilobytes of markup. Shapes are deliberately simple: a silhouette reads by
 * outline alone, which is forgiving to draw and cheap to animate.
 *
 * Server-rendered on purpose -- these are static markup and need no client
 * JavaScript, so they stay out of the bundle entirely.
 */

const SOOT = '#060504'
const NEAR = '#0b0907'
const MID = '#120d09'
const FAR = '#1b1309'
const BRASS = '#d1a942'
const PATINA = '#5c8f80'

/* ----------------------------------------------------------------- helpers */

/** A cog outline. Teeth are square-ish because they only ever read as a shape. */
function gearPath(r: number, teeth: number, depth: number): string {
  const points: string[] = []
  const step = (Math.PI * 2) / (teeth * 2)
  for (let i = 0; i < teeth * 2; i++) {
    const radius = i % 2 === 0 ? r : r - depth
    const angle = i * step
    points.push(`${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

/**
 * A deterministic roofline. Seeded rather than random so the server and client
 * render identical markup -- a hydration mismatch here would be a flash of
 * different skyline on every load.
 */
function skylinePath(seed: number, width: number, base: number, min: number, max: number): string {
  let state = seed
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }

  const d: string[] = [`M0,${base}`]
  let x = 0
  while (x < width) {
    const w = 22 + next() * 52
    const h = min + next() * (max - min)
    const right = Math.min(x + w, width)
    d.push(`L${x.toFixed(1)},${(base - h).toFixed(1)}`)
    // The odd chimney or roof spike, to break up the flat tops.
    if (next() > 0.72) {
      const cx = x + w * 0.3
      d.push(
        `L${cx.toFixed(1)},${(base - h).toFixed(1)}`,
        `L${cx.toFixed(1)},${(base - h - 14).toFixed(1)}`,
        `L${(cx + 7).toFixed(1)},${(base - h - 14).toFixed(1)}`,
        `L${(cx + 7).toFixed(1)},${(base - h).toFixed(1)}`,
      )
    }
    d.push(`L${right.toFixed(1)},${(base - h).toFixed(1)}`)
    x += w
  }
  d.push(`L${width},${base}Z`)
  return d.join('')
}

/* -------------------------------------------------------------- primitives */

function Sky({ glow = BRASS, intensity = 0.3, high = false }: {
  glow?: string; intensity?: number
  /** Adds a softer wash up in the sky, so airships have something to read against. */
  high?: boolean
}) {
  return (
    <>
      <rect x="0" y="0" width="800" height="240" fill="url(#sky)" />
      {/* The class goes on the wrapper; the child keeps the real opacity. */}
      <g className="lamp-glow">
        <ellipse
          cx="470"
          cy="196"
          rx="340"
          ry="128"
          fill={glow}
          opacity={intensity}
          style={{ filter: 'blur(30px)' }}
        />
        {high && (
          <ellipse
            cx="500"
            cy="92"
            rx="330"
            ry="76"
            fill={glow}
            opacity={intensity * 0.55}
            style={{ filter: 'blur(34px)' }}
          />
        )}
      </g>
    </>
  )
}

function Fog() {
  return (
    <g opacity="0.5">
      <ellipse cx="250" cy="196" rx="330" ry="24" fill="#e9dcc3" opacity="0.07" className="fog-far" />
      <ellipse cx="600" cy="206" rx="290" ry="18" fill="#e9dcc3" opacity="0.09" className="fog-near" />
    </g>
  )
}

function Skyline({ seed = 7 }: { seed?: number }) {
  return (
    <>
      <path d={skylinePath(seed, 800, 212, 30, 96)} fill={FAR} opacity="0.85" />
      <path d={skylinePath(seed + 91, 800, 216, 18, 62)} fill={MID} />
    </>
  )
}

function Ground({ y = 214 }: { y?: number }) {
  return <rect x="0" y={y} width="800" height={240 - y} fill={SOOT} />
}

function Rain() {
  const drops = [40, 110, 175, 240, 305, 380, 450, 520, 600, 660, 720, 770]
  return (
    <g stroke="#e9dcc3" strokeWidth="1" opacity="0.16">
      {drops.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1="-20"
          x2={x - 6}
          y2="10"
          className={i % 3 === 0 ? 'rain' : i % 3 === 1 ? 'rain-2' : 'rain-3'}
        />
      ))}
    </g>
  )
}

/** A noir figure: hat, long coat, no face. Origin is top-left of a 44x96 box. */
function Detective({ x, y, scale = 1, flip = false, className }: {
  x: number; y: number; scale?: number; flip?: boolean; className?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      {/* Animated class nested, so it cannot clobber the transform above. */}
      <g className={className} fill={SOOT}>
        <path d="M22,3 C15,3 11,8 11,14 L11,17 L2,19 Q-1,23 3,24 L41,24 Q45,23 42,19 L33,17 L33,14 C33,8 29,3 22,3 Z" />
        <path d="M17,23 h10 v8 h-10 z" />
        <path d="M13,29 h18 q7,4 7,15 l-2,26 h-4 l-2,26 h-8 l-1,-34 l-1,34 h-8 l-2,-26 h-4 l-2,-26 q0,-11 7,-15 z" />
      </g>
    </g>
  )
}

function LampPost({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="lamp-glow">
        <circle cx="0" cy="-96" r="34" fill={BRASS} opacity="0.22" style={{ filter: 'blur(12px)' }} />
      </g>
      <g fill={SOOT}>
        <rect x="-3" y="-92" width="6" height="92" />
        <rect x="-12" y="-2" width="24" height="6" rx="2" />
        <path d="M-11,-92 L11,-92 L7,-112 L-7,-112 Z" />
        <rect x="-9" y="-116" width="18" height="5" rx="2" />
        <path d="M0,-124 L4,-116 L-4,-116 Z" />
      </g>
      <g className="lamp-gutter">
        <rect x="-6" y="-108" width="12" height="14" fill={BRASS} opacity="0.7" />
      </g>
    </g>
  )
}

function Airship({ x, y, scale = 1, className = 'airship' }: {
  x: number; y: number; scale?: number; className?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className}>
        {/* Rim light: without it a black hull vanishes into a black sky. */}
        <g fill={SOOT} stroke={BRASS} strokeOpacity="0.5" strokeWidth={1.6 / scale}>
          <ellipse cx="0" cy="0" rx="58" ry="20" />
          <path d="M52,0 L74,-11 L74,11 Z" />
          <rect x="-16" y="18" width="32" height="11" rx="3" />
        </g>
        <rect x="-3" y="17" width="6" height="4" fill={SOOT} />
        <g className="lamp-glow">
          <circle cx="-52" cy="0" r="4" fill={BRASS} opacity="0.8" />
        </g>
      </g>
    </g>
  )
}

function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#e9dcc3" opacity="0.13">
      <circle cx={x} cy={y} r="7" className="smoke" />
      <circle cx={x + 3} cy={y} r="6" className="smoke smoke-2" />
      <circle cx={x - 2} cy={y} r="8" className="smoke smoke-3" />
    </g>
  )
}

function Gear({ x, y, r, teeth = 10, spin = 'gear-slow', fill = SOOT, opacity = 1 }: {
  x: number; y: number; r: number; teeth?: number; spin?: string; fill?: string; opacity?: number
}) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <g className={spin}>
        <path d={gearPath(r, teeth, r * 0.22)} fill={fill} />
        <circle cx="0" cy="0" r={r * 0.3} fill="#0a0807" />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ scenes */

const SCENES: Record<string, ReactNode> = {
  /* --------------------------------------------------------------- opening */
  title: (
    <>
      <Sky intensity={0.32} high />
      <Skyline seed={11} />
      <Airship x={596} y={84} scale={0.72} />
      <Airship x={60} y={58} scale={0.34} className="airship-passing" />
      <Fog />
      <Ground />
      <LampPost x={120} y={214} />
      <LampPost x={690} y={214} scale={0.8} />
      <Detective x={300} y={128} scale={0.9} />
      <Rain />
    </>
  ),

  /* ------------------------------------------------------------ case files */
  'case-1': (
    <>
      <Sky glow="#b4713f" intensity={0.26} />
      <Skyline seed={23} />
      <Fog />
      <Ground />
      {/* A filing cabinet, still smouldering. */}
      <g fill={SOOT} transform="translate(330 96)">
        <rect x="0" y="0" width="96" height="118" rx="3" />
        <rect x="8" y="12" width="80" height="2" fill="#1b1309" />
        <rect x="8" y="44" width="80" height="2" fill="#1b1309" />
        <rect x="8" y="76" width="80" height="2" fill="#1b1309" />
        <rect x="40" y="24" width="16" height="4" fill="#1b1309" />
        {/* The drawer somebody left open. */}
        <rect x="-16" y="84" width="76" height="26" rx="2" />
      </g>
      <g className="ember"><circle cx="360" cy="180" r="2" fill="#d1a942" /></g>
      <g className="ember ember-2"><circle cx="392" cy="186" r="1.6" fill="#b4713f" /></g>
      <g className="ember ember-3"><circle cx="410" cy="176" r="2.2" fill="#d1a942" /></g>
      <Smoke x={380} y={92} />
      <Detective x={520} y={128} scale={0.85} flip />
      <LampPost x={168} y={214} scale={0.9} />
    </>
  ),

  'case-2': (
    <>
      <Sky glow={PATINA} intensity={0.22} high />
      <Skyline seed={41} />
      <Fog />
      <Ground />
      {/* Pneumatic tubes running along the wall. */}
      <g fill={SOOT}>
        <rect x="0" y="120" width="800" height="12" rx="6" />
        <rect x="0" y="146" width="800" height="8" rx="4" />
        {[90, 250, 430, 610, 740].map((x) => (
          <rect key={x} x={x} y="112" width="14" height="50" rx="3" />
        ))}
      </g>
      {/* A capsule in transit. */}
      <g className="airship-passing">
        <rect x="0" y="121" width="34" height="10" rx="5" fill={BRASS} opacity="0.5" />
      </g>
      <Detective x={330} y={128} scale={0.9} />
      <LampPost x={640} y={214} scale={0.85} />
      <Rain />
    </>
  ),

  'case-3': (
    <>
      <Sky intensity={0.3} />
      <Skyline seed={67} />
      <Fog />
      <Ground />
      {/* Clock tower. */}
      <g fill={SOOT} transform="translate(352 34)">
        <rect x="0" y="40" width="96" height="180" />
        <path d="M-10,40 L48,0 L106,40 Z" />
        <circle cx="48" cy="86" r="34" fill="#0f0b08" stroke={BRASS} strokeOpacity="0.35" strokeWidth="2" />
        <g className="pendulum">
          <rect x="46" y="86" width="4" height="66" fill={BRASS} opacity="0.4" />
          <circle cx="48" cy="156" r="9" fill={BRASS} opacity="0.4" />
        </g>
        <circle cx="48" cy="86" r="3" fill={BRASS} opacity="0.6" />
      </g>
      <Gear x={148} y={150} r={44} teeth={12} spin="gear-slow" opacity={0.9} />
      <Gear x={214} y={186} r={26} teeth={9} spin="gear-mid" opacity={0.9} />
      <LampPost x={640} y={214} />
      <Detective x={560} y={130} scale={0.86} flip />
    </>
  ),

  'case-4': (
    <>
      <Sky glow="#b4713f" intensity={0.24} />
      <Ground y={206} />
      {/* Foundry interior: pipes overhead, vault below. */}
      <g fill={SOOT}>
        <rect x="0" y="0" width="800" height="26" />
        {[60, 180, 300, 500, 640, 760].map((x) => (
          <rect key={x} x={x} y="26" width="16" height="30" rx="4" />
        ))}
      </g>
      <g transform="translate(400 122)">
        <circle cx="0" cy="0" r="86" fill={NEAR} />
        <circle cx="0" cy="0" r="86" fill="none" stroke={BRASS} strokeOpacity="0.28" strokeWidth="3" />
        <Gear x={0} y={0} r={60} teeth={16} spin="gear-slow" fill="#0d0a07" />
        <circle cx="0" cy="0" r="20" fill={SOOT} />
        {/* Eight locks around the rim. */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <circle
              key={i}
              cx={Math.cos(a) * 72}
              cy={Math.sin(a) * 72}
              r="5"
              fill={i === 7 ? BRASS : '#241a12'}
              opacity={i === 7 ? 0.85 : 1}
            />
          )
        })}
      </g>
      <Smoke x={120} y={200} />
      <Detective x={620} y={120} scale={0.92} flip />
    </>
  ),

  'case-5': (
    <>
      <Sky intensity={0.42} high />
      <Skyline seed={101} />
      <Fog />
      <Ground />
      {/* Nine airships, leaving at dawn. */}
      <Airship x={128} y={92} scale={0.4} />
      <Airship x={296} y={62} scale={0.3} />
      <Airship x={452} y={100} scale={0.5} />
      <Airship x={606} y={58} scale={0.28} />
      <Airship x={716} y={96} scale={0.36} />
      <g opacity="0.6">
        <Airship x={206} y={126} scale={0.2} />
        <Airship x={372} y={132} scale={0.18} />
        <Airship x={536} y={122} scale={0.22} />
        <Airship x={664} y={136} scale={0.16} />
      </g>
      <LampPost x={90} y={214} scale={0.9} />
      <Detective x={380} y={128} scale={0.92} />
    </>
  ),

  /* --------------------------------------------------------- case I puzzles */
  'c1-1': (
    <>
      <Sky glow="#b4713f" intensity={0.24} />
      <Ground y={200} />
      {/* A charred page held to the lamplight. */}
      <g transform="translate(300 52)">
        <path d="M0,0 L150,0 L150,118 L0,118 Z" fill="#241a12" opacity="0.5" />
        <path
          d="M0,0 L150,0 L150,118 L0,118 Z M6,10 q10,4 20,0 t20,0 M6,30 q14,5 28,0 t28,0"
          fill="none"
          stroke={BRASS}
          strokeOpacity="0.3"
          strokeWidth="2"
        />
        {/* Burnt, curling edge. */}
        <path d="M150,0 q-18,20 0,40 q-22,24 0,48 q-16,20 0,30 L150,118 Z" fill={SOOT} />
      </g>
      <g className="ember"><circle cx="452" cy="140" r="2" fill="#d1a942" /></g>
      <g className="ember ember-2"><circle cx="446" cy="112" r="1.6" fill="#b4713f" /></g>
      <Smoke x={450} y={60} />
      <LampPost x={140} y={200} scale={0.86} />
      <Detective x={560} y={112} scale={0.88} flip />
    </>
  ),

  'c1-2': (
    <>
      <Sky glow="#b4713f" intensity={0.28} />
      <Skyline seed={5} />
      <Ground />
      {/* Foundry chimneys venting. */}
      <g fill={SOOT}>
        <rect x="120" y="70" width="34" height="146" />
        <rect x="176" y="98" width="28" height="118" />
        <rect x="600" y="86" width="30" height="130" />
      </g>
      <Smoke x={137} y={70} />
      <Smoke x={615} y={86} />
      {/* Punched tape running through the frame. */}
      <g transform="translate(0 150)">
        <rect x="240" y="0" width="330" height="30" fill="#241a12" opacity="0.55" />
        <g className="tape">
          {Array.from({ length: 40 }, (_, i) => (
            <circle
              key={i}
              cx={248 + i * 24}
              cy={15}
              r={i % 3 === 0 ? 5 : 2.5}
              fill={SOOT}
            />
          ))}
        </g>
      </g>
      <Fog />
      <Detective x={640} y={128} scale={0.82} flip />
    </>
  ),

  'c1-3': (
    <>
      <Sky glow={PATINA} intensity={0.2} />
      <Ground y={206} />
      {/* Apothecary shelf: bottles of assorted awfulness. */}
      <g fill={SOOT}>
        <rect x="180" y="150" width="440" height="8" />
        <rect x="180" y="76" width="440" height="8" />
      </g>
      {[
        [210, 30], [252, 44], [292, 26], [336, 50], [382, 34],
        [428, 46], [470, 28], [514, 42], [558, 32],
      ].map(([x, h], i) => (
        <g key={x} fill={SOOT} transform={`translate(${x} ${150 - h})`}>
          <rect x="0" y="6" width="24" height={h - 6} rx="4" />
          <rect x="8" y="0" width="8" height="8" />
          <rect x="3" y={h - 18} width="18" height="10" fill={i % 3 === 0 ? PATINA : BRASS} opacity="0.22" />
        </g>
      ))}
      <g transform="translate(210 44)">
        {[0, 42, 84, 126, 168, 210, 252, 294, 336].map((x, i) => (
          <rect key={x} x={x} y={i % 2 ? 6 : 0} width="24" height={i % 2 ? 26 : 32} rx="4" fill={SOOT} />
        ))}
      </g>
      <LampPost x={664} y={206} scale={0.8} />
      <Detective x={92} y={116} scale={0.9} />
    </>
  ),

  /* -------------------------------------------------------- case II puzzles */
  'c2-1': (
    <>
      <Sky glow={PATINA} intensity={0.2} />
      <Skyline seed={13} />
      <Fog />
      <Ground />
      {/* A public notice, pasted and re-pasted on a board. */}
      <g transform="translate(300 46)">
        <rect x="-8" y="-8" width="216" height="150" fill={SOOT} />
        <rect x="0" y="0" width="200" height="134" fill="#241a12" opacity="0.7" />
        {[14, 34, 54, 74, 94, 114].map((y, i) => (
          <rect key={y} x="14" y={y} width={i % 2 ? 140 : 172} height="6" fill={BRASS} opacity="0.16" />
        ))}
        <rect x="88" y="134" width="10" height="72" fill={SOOT} />
      </g>
      {/* The magnifier: the thing you are meant to reach for. */}
      <g transform="translate(470 120)">
        <circle cx="0" cy="0" r="34" fill="none" stroke={SOOT} strokeWidth="8" />
        <g className="lamp-glow"><circle cx="0" cy="0" r="30" fill={BRASS} opacity="0.12" /></g>
        <rect x="22" y="22" width="10" height="40" rx="4" transform="rotate(-45 22 22)" fill={SOOT} />
      </g>
      <Detective x={600} y={122} scale={0.88} flip />
      <LampPost x={150} y={214} scale={0.86} />
    </>
  ),

  'c2-2': (
    <>
      <Sky glow={PATINA} intensity={0.16} />
      <Ground y={210} />
      {/* A corridor of doors -- one of them ajar, spilling light. */}
      <rect x="0" y="0" width="800" height="240" fill="#0a0807" />
      <g fill={SOOT}>
        <rect x="60" y="60" width="80" height="150" />
        <rect x="200" y="60" width="80" height="150" />
        <rect x="480" y="60" width="80" height="150" />
        <rect x="620" y="60" width="80" height="150" />
      </g>
      {/* The disallowed corridor. */}
      <g transform="translate(340 60)">
        <rect x="0" y="0" width="80" height="150" fill="#0e0b08" />
        <g className="lamp-glow"><path d="M56,0 L80,0 L80,150 L56,150 Z" fill={BRASS} opacity="0.28" /></g>
        <path d="M80,0 L120,-14 L120,164 L80,150 Z" fill={BRASS} opacity="0.07" />
        <circle cx="48" cy="82" r="4" fill={BRASS} opacity="0.5" />
      </g>
      <g className="scanline">
        <rect x="340" y="60" width="80" height="3" fill={PATINA} opacity="0.4" />
      </g>
      <Detective x={520} y={126} scale={0.86} flip />
      <Fog />
    </>
  ),

  'c2-3': (
    <>
      <Sky glow={PATINA} intensity={0.18} />
      <Ground y={210} />
      {/* A sealed door, and the routing tag nobody reads. */}
      <g transform="translate(300 40)">
        <rect x="0" y="0" width="200" height="170" fill={NEAR} />
        <rect x="0" y="0" width="200" height="170" fill="none" stroke={BRASS} strokeOpacity="0.24" strokeWidth="3" />
        <circle cx="164" cy="94" r="9" fill={SOOT} />
        <circle cx="100" cy="52" r="26" fill={SOOT} />
        <rect x="94" y="52" width="12" height="26" fill={SOOT} />
        {/* The header tag, hanging off the tube. */}
        <g transform="translate(-84 88)">
          <rect x="0" y="0" width="76" height="44" rx="3" fill="#241a12" />
          <rect x="8" y="10" width="58" height="4" fill={BRASS} opacity="0.35" />
          <g className="lamp-glow"><rect x="8" y="22" width="44" height="4" fill={BRASS} opacity="0.6" /></g>
          <rect x="8" y="32" width="52" height="4" fill={BRASS} opacity="0.2" />
          <line x1="76" y1="12" x2="96" y2="6" stroke={SOOT} strokeWidth="3" />
        </g>
      </g>
      <g className="spark"><circle cx="464" cy="134" r="3" fill={PATINA} /></g>
      <Detective x={584} y={126} scale={0.86} flip />
      <LampPost x={140} y={210} scale={0.82} />
    </>
  ),

  /* ------------------------------------------------------- case III puzzles */
  'c3-1': (
    <>
      <Sky intensity={0.34} />
      <Skyline seed={29} />
      <Fog />
      <Ground />
      <LampPost x={200} y={214} />
      <LampPost x={430} y={214} scale={0.92} />
      <LampPost x={650} y={214} scale={0.84} />
      {/* The lamplighter, working his way down the road. */}
      <g className="walker">
        <g transform="translate(0 126)">
          <Detective x={0} y={0} scale={0.8} />
          <rect x="34" y="-34" width="4" height="70" rx="2" fill={SOOT} transform="rotate(18 34 -34)" />
        </g>
      </g>
      <Rain />
    </>
  ),

  'c3-2': (
    <>
      <Sky glow={PATINA} intensity={0.24} />
      <Skyline seed={53} />
      <Fog />
      <Ground />
      {/* Telegraph poles and singing wire. */}
      {[110, 330, 550, 760].map((x, i) => (
        <g key={x} fill={SOOT} transform={`translate(${x} 0)`}>
          <rect x="-5" y="52" width="10" height="164" />
          <rect x="-32" y="60" width="64" height="7" rx="2" />
          <rect x="-24" y="82" width="48" height="6" rx="2" />
          {i < 3 && (
            <>
              <path d={`M6,62 Q${(220) / 2},92 214,62`} fill="none" stroke={SOOT} strokeWidth="2.5" />
              <path d={`M6,84 Q${(220) / 2},112 214,84`} fill="none" stroke={SOOT} strokeWidth="2" />
            </>
          )}
        </g>
      ))}
      {/* Dots and dashes down the wire. */}
      <g transform="translate(150 74)">
        <circle cx="0" cy="0" r="4" fill={PATINA} className="spark" />
        <rect x="34" y="-2" width="18" height="4" rx="2" fill={PATINA} className="spark-2" />
        <circle cx="86" cy="0" r="4" fill={PATINA} className="spark-3" />
        <rect x="116" y="-2" width="18" height="4" rx="2" fill={PATINA} className="spark" />
      </g>
      <Detective x={620} y={128} scale={0.86} flip />
    </>
  ),

  'c3-3': (
    <>
      <Sky intensity={0.28} />
      <Ground y={208} />
      {/* Interlocking wheels: the same shift, turning under a keyword. */}
      <Gear x={250} y={112} r={78} teeth={18} spin="gear-slow" fill="#0d0a07" />
      <Gear x={400} y={112} r={52} teeth={13} spin="gear-mid" fill="#100c08" />
      <Gear x={512} y={148} r={34} teeth={10} spin="gear-fast" fill="#120d09" />
      {/* Letter ring on the big wheel. */}
      <g transform="translate(250 112)" opacity="0.5">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return <circle key={i} cx={Math.cos(a) * 58} cy={Math.sin(a) * 58} r="3" fill={BRASS} />
        })}
      </g>
      <Fog />
      <Detective x={630} y={122} scale={0.88} flip />
      <LampPost x={110} y={208} scale={0.8} />
    </>
  ),

  /* -------------------------------------------------------- case IV puzzles */
  'c4-1': (
    <>
      <Sky glow="#b4713f" intensity={0.2} />
      <Ground y={208} />
      {/* The key rack: eight hooks, one empty. */}
      <g fill={SOOT}>
        <rect x="200" y="60" width="400" height="10" rx="3" />
        {Array.from({ length: 8 }, (_, i) => {
          const x = 226 + i * 50
          return <rect key={i} x={x} y="70" width="6" height="14" />
        })}
      </g>
      {Array.from({ length: 8 }, (_, i) => {
        const x = 229 + i * 50
        // The eighth key is missing -- signed out, never returned.
        if (i === 7) return null
        return (
          <g key={i} fill={SOOT} transform={`translate(${x} 84)`}>
            <circle cx="0" cy="10" r="10" />
            <circle cx="0" cy="10" r="4" fill="#0a0807" />
            <rect x="-2" y="18" width="4" height="40" />
            <rect x="-2" y="48" width="12" height="4" />
            <rect x="-2" y="56" width="9" height="4" />
          </g>
        )
      })}
      <g transform="translate(578 94)" opacity="0.55">
        <g className="lamp-glow"><circle cx="0" cy="0" r="14" fill="none" stroke={BRASS} strokeWidth="2" strokeDasharray="4 4" /></g>
      </g>
      <Detective x={90} y={116} scale={0.9} />
      <LampPost x={690} y={208} scale={0.8} />
      <Fog />
    </>
  ),

  'c4-2': (
    <>
      <Sky glow="#b4713f" intensity={0.22} />
      <Ground y={208} />
      {/* A 256-position brass wheel bolted to the vault housing. */}
      <g transform="translate(400 118)">
        <circle cx="0" cy="0" r="96" fill={NEAR} />
        <g className="gear-slow">
          <circle cx="0" cy="0" r="88" fill="none" stroke={BRASS} strokeOpacity="0.3" strokeWidth="2" />
          {Array.from({ length: 32 }, (_, i) => {
            const a = (i / 32) * Math.PI * 2
            const inner = i % 4 === 0 ? 72 : 80
            return (
              <line
                key={i}
                x1={Math.cos(a) * inner}
                y1={Math.sin(a) * inner}
                x2={Math.cos(a) * 88}
                y2={Math.sin(a) * 88}
                stroke={BRASS}
                strokeOpacity={i % 4 === 0 ? 0.6 : 0.28}
                strokeWidth="2"
              />
            )
          })}
          <path d={gearPath(64, 14, 12)} fill="#0d0a07" />
        </g>
        <circle cx="0" cy="0" r="22" fill={SOOT} />
        <path d="M0,-104 L8,-92 L-8,-92 Z" fill={BRASS} opacity="0.8" />
      </g>
      <Gear x={128} y={168} r={40} teeth={11} spin="gear-mid" opacity={0.8} />
      <Gear x={672} y={168} r={40} teeth={11} spin="gear-fast" opacity={0.8} />
      <Fog />
    </>
  ),

  'c4-3': (
    <>
      <Sky glow="#b4713f" intensity={0.26} />
      <Ground y={210} />
      {/* The talking door, coming open. */}
      <g transform="translate(280 32)">
        <rect x="-10" y="-10" width="260" height="200" fill={SOOT} />
        <rect x="0" y="0" width="240" height="180" fill="#0e0a07" />
        <g className="vault-leaf">
          <rect x="0" y="0" width="240" height="180" fill={NEAR} />
          <circle cx="120" cy="90" r="54" fill="none" stroke={BRASS} strokeOpacity="0.3" strokeWidth="3" />
          <g className="gear-fast">
            <rect x="112" y="40" width="16" height="100" rx="6" fill={SOOT} />
            <rect x="70" y="82" width="100" height="16" rx="6" fill={SOOT} />
          </g>
          <circle cx="120" cy="90" r="14" fill={SOOT} />
        </g>
        {/* Light from the empty chapel-sized room behind it. */}
        <g className="lamp-glow"><rect x="0" y="0" width="240" height="180" fill={BRASS} opacity="0.09" /></g>
      </g>
      {/* A chair, bolted to the floor. */}
      <g fill={SOOT} transform="translate(600 150)">
        <rect x="0" y="26" width="42" height="6" />
        <rect x="2" y="32" width="5" height="28" />
        <rect x="35" y="32" width="5" height="28" />
        <rect x="34" y="-14" width="6" height="42" />
        <rect x="34" y="-14" width="22" height="5" />
      </g>
      <Detective x={110} y={122} scale={0.9} />
    </>
  ),

  /* --------------------------------------------------------- case V puzzles */
  'c5-1': (
    <>
      <Sky intensity={0.3} high />
      <Skyline seed={83} />
      <Fog />
      <Ground />
      {/* A manifest, folded in on itself. */}
      <g transform="translate(300 54)">
        {[0, 14, 28].map((o, i) => (
          <g key={o} transform={`translate(${o} ${o * 0.7}) rotate(${(i - 1) * 3} 100 60)`}>
            <rect x="0" y="0" width="180" height="116" fill="#241a12" opacity={0.4 + i * 0.2} />
            <rect x="0" y="0" width="180" height="116" fill="none" stroke={BRASS} strokeOpacity="0.2" strokeWidth="1.5" />
            {[16, 34, 52, 70, 88].map((y) => (
              <rect key={y} x="12" y={y} width={140 - i * 18} height="4" fill={BRASS} opacity="0.14" />
            ))}
          </g>
        ))}
      </g>
      <Airship x={60} y={62} scale={0.32} className="airship-passing" />
      <Detective x={620} y={126} scale={0.86} flip />
      <LampPost x={130} y={214} scale={0.84} />
    </>
  ),

  'c5-2': (
    <>
      <Sky intensity={0.46} high />
      <Skyline seed={97} />
      <Fog />
      <Ground />
      {/* Dawn over the river, and nine ships already leaving. */}
      <g className="lamp-glow">
        <circle cx="640" cy="128" r="46" fill={BRASS} opacity="0.2" style={{ filter: 'blur(10px)' }} />
      </g>
      <Airship x={548} y={80} scale={0.46} />
      <Airship x={684} y={104} scale={0.3} />
      <Airship x={424} y={56} scale={0.24} />
      {/* A hat, left on the ground. */}
      <g fill={SOOT} transform="translate(250 196)">
        <ellipse cx="26" cy="14" rx="30" ry="7" />
        <path d="M8,14 q0,-18 18,-18 q18,0 18,18 z" />
      </g>
      <Detective x={140} y={126} scale={0.9} className="breathe" />
      <LampPost x={80} y={214} scale={0.86} />
      <Rain />
    </>
  ),

  /* ------------------------------------------------------- advanced tracks */
  'case-6': (
    <>
      <Sky intensity={0.3} high />
      <Skyline seed={131} />
      <Fog />
      <Ground />
      {/* A crate on the dock, stencilled and waiting. */}
      <g fill={SOOT} transform="translate(300 118)">
        <rect x="0" y="0" width="150" height="96" rx="2" />
        <rect x="0" y="30" width="150" height="4" fill="#1b1309" />
        <rect x="0" y="62" width="150" height="4" fill="#1b1309" />
        <rect x="18" y="12" width="52" height="6" fill={BRASS} opacity="0.28" />
        <rect x="18" y="76" width="88" height="5" fill={BRASS} opacity="0.18" />
      </g>
      <Airship x={600} y={78} scale={0.6} />
      <LampPost x={150} y={214} scale={0.9} />
      <Detective x={520} y={128} scale={0.86} flip />
      <Rain />
    </>
  ),

  'case-9': (
    <>
      <Sky glow={PATINA} intensity={0.24} />
      <Ground y={208} />
      {/* The drum room: memory as machinery. */}
      {[150, 290, 430, 570, 700].map((x, i) => (
        <g key={x} transform={`translate(${x} 112)`}>
          <ellipse cx="0" cy="0" rx="46" ry="70" fill={NEAR} />
          <ellipse cx="0" cy="0" rx="46" ry="70" fill="none" stroke={PATINA} strokeOpacity="0.28" strokeWidth="2" />
          <g className={i % 2 ? 'gear-mid' : 'gear-slow'}>
            <ellipse cx="0" cy="0" rx="30" ry="52" fill="#0b0907" />
          </g>
          <circle cx="0" cy="0" r="6" fill={SOOT} />
        </g>
      ))}
      <g fill={SOOT}>
        <rect x="0" y="0" width="800" height="22" />
        <rect x="0" y="200" width="800" height="10" />
      </g>
      <g className="spark"><circle cx="240" cy="60" r="3" fill={PATINA} /></g>
      <g className="spark-2"><circle cx="500" cy="52" r="3" fill={PATINA} /></g>
      <Fog />
    </>
  ),
}

/* ------------------------------------------------------------------ export */

/** Maps a challenge id prefix to the case plate it should borrow. */
const CASE_OF: Record<string, string> = {
  c1: 'case-1', c2: 'case-2', c3: 'case-3', c4: 'case-4', c5: 'case-5',
  m1: 'case-6', m2: 'case-7', m3: 'case-8',
  x1: 'case-9', x2: 'case-9',
}

export type SceneId = keyof typeof SCENES

export function hasScene(id: string): boolean {
  return id in SCENES
}

export default function SilhouetteScene({
  id,
  height = 200,
  className = '',
}: {
  id: string
  /** Rendered height in px. The artwork scales to fit. */
  height?: number
  className?: string
}) {
  // c2-3 -> case-2, m1-1 -> case-6, x1-2 -> case-9. A challenge without its own
  // plate borrows its case's rather than dropping to the title card.
  const fallback = CASE_OF[id.slice(0, 2)]
  const scene = SCENES[id] ?? (fallback ? SCENES[fallback] : undefined) ?? SCENES.title

  return (
    <div className={`scene-frame ${className}`} style={{ height }} aria-hidden="true">
      <svg
        className="scene"
        viewBox="0 0 800 240"
        preserveAspectRatio="xMidYMax slice"
        style={{ height: '100%', width: '100%' }}
        role="presentation"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d0a07" />
            <stop offset="62%" stopColor="#191108" />
            <stop offset="100%" stopColor="#241708" />
          </linearGradient>
        </defs>
        {scene}
      </svg>
    </div>
  )
}
