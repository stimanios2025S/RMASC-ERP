// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Animated Letter-by-Letter Logo
//  Au survol, chaque lettre s'anime séquentiellement de la première
//  à la dernière — effet 3D, couleur, et lueur progressifs.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react'

const RMASC_CHARS = ['R', 'M', 'A', 'S', 'C']
const FACTORY_CHARS = ['F', 'A', 'C', 'T', 'O', 'R', 'Y']

export default function AnimatedLogo() {
  const [hovered, setHovered] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const startAnimation = useCallback(() => {
    setHovered(true)
    setActiveIndex(0)

    // Avance lettre par lettre
    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      if (i >= RMASC_CHARS.length + FACTORY_CHARS.length + 1) {
        clearInterval(intervalRef.current)
        setActiveIndex(RMASC_CHARS.length + FACTORY_CHARS.length) // all lit
        return
      }
      setActiveIndex(i)
    }, 70)
  }, [])

  const stopAnimation = useCallback(() => {
    setHovered(false)
    clearInterval(intervalRef.current)

    // Revenir lettre par lettre en sens inverse
    let i = RMASC_CHARS.length + FACTORY_CHARS.length + 1
    const iv = setInterval(() => {
      i--
      if (i < 0) {
        clearInterval(iv)
        setActiveIndex(-1)
        return
      }
      setActiveIndex(i)
    }, 30)
  }, [])

  const totalLetters = RMASC_CHARS.length + FACTORY_CHARS.length

  return (
    <div
      className="inline-block cursor-pointer select-none"
      onMouseEnter={startAnimation}
      onMouseLeave={stopAnimation}
    >
      <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-none max-w-full overflow-hidden">
        {/* R M A S C */}
        <span className="inline-flex">
          {RMASC_CHARS.map((char, i) => {
            const idx = i
            const isActive = activeIndex >= idx
            const justLit = activeIndex === idx
            return (
              <span
                key={`rm-${i}`}
                className={`inline-block transition-all duration-200 ${
                  isActive
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110'
                    : 'text-white/30'
                } ${justLit ? 'animate-letter-pop' : ''}`}
                style={{
                  transform: isActive
                    ? `translateY(${Math.sin(idx * 0.5) * -3}px)`
                    : 'translateY(0px)',
                  transitionDelay: '0ms',
                }}
              >
                {char}
              </span>
            )
          })}
        </span>

        {/* Space */}
        <span className="inline-block w-[0.3em]" />

        {/* F A C T O R Y */}
        <span className="inline-flex">
          {FACTORY_CHARS.map((char, i) => {
            const idx = RMASC_CHARS.length + i
            const isActive = activeIndex >= idx
            const justLit = activeIndex === idx
            return (
              <span
                key={`fc-${i}`}
                className={`inline-block transition-all duration-200 ${
                  isActive
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110'
                    : 'text-white/30'
                } ${justLit ? 'animate-letter-pop' : ''}`}
                style={{
                  transform: isActive
                    ? `translateY(${Math.sin(idx * 0.5) * -3}px)`
                    : 'translateY(0px)',
                  transitionDelay: '0ms',
                }}
              >
                {char}
              </span>
            )
          })}
        </span>

        {/* Toujours visible : le RM ASC en arrière-plan atténué */}
        <div className="absolute inset-0 pointer-events-none opacity-0" aria-hidden="true">
          <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]">RM</span>
          <span className="text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]">ASC</span>
          <span className="text-amber-400"> FACTORY</span>
        </div>
      </h1>

      {/* Progress bar under the logo */}
      <div className="mt-2 h-[2px] rounded-full bg-slate-800 overflow-hidden transition-opacity duration-300" style={{ opacity: hovered ? 1 : 0.2 }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 transition-all duration-[70ms]"
          style={{ width: `${Math.max(0, Math.min(100, totalLetters > 1 ? (activeIndex / (totalLetters - 1)) * 100 : 0))}%` }}
        />
      </div>

      <style>{animLogoStyles}</style>
    </div>
  )
}

const animLogoStyles = `
  @keyframes letter-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.3) translateY(-4px); }
    100% { transform: scale(1.1) translateY(-2px); }
  }
  .animate-letter-pop {
    animation: letter-pop 0.35s ease-out forwards;
  }
`
