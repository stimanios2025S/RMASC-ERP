// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Animated Elevator Scene
//  Scène complète avec ascenseur, panneau de contrôle, poulies,
//  câbles, contre-poids, indicateurs lumineux — 100% CSS + React
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react'

type Floor = 1 | 2 | 3 | 4 | 5 | 6
const FLOORS: Floor[] = [1, 2, 3, 4, 5, 6]

// ─── Poulie tournante ─────────────────────────────────────────────────────
function Pulley({ size = 20, speed = 3 }: { size?: number; speed?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(251,146,60,0.3)" strokeWidth="2" />
        <circle cx="20" cy="20" r="8" fill="none" stroke="rgba(251,146,60,0.5)" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="3" fill="rgba(251,146,60,0.4)" />
        <g style={{ transformOrigin: '20px 20px', animation: `pulley-spin ${speed}s linear infinite` }}>
          <line x1="20" y1="3" x2="20" y2="8" stroke="rgba(251,146,60,0.6)" strokeWidth="1" />
          <line x1="20" y1="32" x2="20" y2="37" stroke="rgba(251,146,60,0.6)" strokeWidth="1" />
          <line x1="3" y1="20" x2="8" y2="20" stroke="rgba(251,146,60,0.6)" strokeWidth="1" />
          <line x1="32" y1="20" x2="37" y2="20" stroke="rgba(251,146,60,0.6)" strokeWidth="1" />
        </g>
      </svg>
    </div>
  )
}

// ─── Panneau de contrôle industriel ───────────────────────────────────────
function ControlPanel({ moving, currentFloor, targetFloor, direction, doorsOpen }: {
  moving: boolean; currentFloor: Floor; targetFloor: Floor; direction: 'up' | 'down'; doorsOpen: boolean
}) {
  const leds = [
    { label: 'PWR', color: 'emerald', on: true, onClass: 'bg-emerald-400 shadow-lg shadow-emerald-400/50' },
    { label: 'RUN', color: 'amber', on: moving, onClass: 'bg-amber-400 shadow-lg shadow-amber-400/50' },
    { label: 'DR', color: 'blue', on: doorsOpen, onClass: 'bg-blue-400 shadow-lg shadow-blue-400/50' },
    { label: 'ERR', color: 'red', on: false, onClass: 'bg-red-400 shadow-lg shadow-red-400/50' },
  ]

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-700/60 p-3 md:p-4 shadow-lg">
      {/* Rangee de LEDs */}
      <div className="flex items-center gap-2 md:gap-3 mb-3">
        {leds.map((led, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${
              led.on
                ? led.onClass + ' animate-pulse'
                : 'bg-slate-700'
            }`} />
            <span className="text-[6px] md:text-[7px] font-bold text-white/50 uppercase tracking-wider">{led.label}</span>
          </div>
        ))}
        <div className="w-px h-6 bg-slate-700/50 mx-1" />
        <div className="flex items-center gap-1">
          <span className={`text-[9px] md:text-[11px] font-bold transition-colors ${direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {direction === 'up' ? '▲' : '▼'}
          </span>
          <span className="text-[10px] md:text-xs font-bold text-white font-mono">FL{targetFloor}</span>
        </div>
      </div>

      {/* Affichage numérique étage */}
      <div className="bg-slate-950 rounded-lg border border-slate-700/60 px-3 py-2 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
        <div className={`text-lg md:text-2xl font-bold font-mono tracking-widest transition-all duration-500 ${
          moving ? 'text-amber-400' : doorsOpen ? 'text-emerald-400' : 'text-white/60'
        }`}>
          {moving ? '—' + targetFloor + '—' : doorsOpen ? '◈' + currentFloor + '◈' : '  ' + currentFloor + '  '}
        </div>
        <div className="text-[6px] md:text-[7px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">
          {moving ? 'EN MOUVEMENT' : doorsOpen ? 'PORTES OUVERTES' : 'ARRÊT'}
        </div>
      </div>

      {/* Barre de progression du trajet */}
      <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-[2500ms] ease-in-out ${
          moving ? 'opacity-100' : 'opacity-0'
        }`}
          style={{ width: moving ? `${Math.abs(targetFloor - currentFloor) * 20}%` : '0%' }}
        />
      </div>
    </div>
  )
}

// ─── Indicateur de charge (poids) ─────────────────────────────────────────
function LoadIndicator({ moving }: { moving: boolean }) {
  const [load, setLoad] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setLoad(Math.random() * 100)
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const loadColor = load > 80 ? { bar: 'bg-red-500', text: 'text-red-500' } : load > 50 ? { bar: 'bg-amber-500', text: 'text-amber-500' } : { bar: 'bg-emerald-500', text: 'text-emerald-500' }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] md:text-[9px] text-white/50 font-semibold uppercase tracking-wider">Charge</span>
      <div className="w-16 md:w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${loadColor.bar}`}
          style={{ width: `${load}%` }} />
      </div>
      <span className={`text-[8px] md:text-[9px] font-mono font-bold ${loadColor.text}`}>
        {Math.round(load)}%
      </span>
    </div>
  )
}

// ─── Câbles animés ────────────────────────────────────────────────────────
function Cables({ cabinPosition, moving }: { cabinPosition: number; moving: boolean }) {
  const cableEnd = cabinPosition + 3

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {/* Câble principal gauche */}
      <div className="absolute left-[22%] top-0 bottom-0 w-[1.5px]"
        style={{
          background: `linear-gradient(to bottom,
            rgba(251,146,60,0.4) 0%,
            rgba(251,146,60,0.2) ${cableEnd}%,
            transparent ${cableEnd + 2}%)`,
          animation: moving ? 'cable-vibrate 0.15s ease-in-out infinite' : 'none',
        }}
      />
      {/* Câble principal droit */}
      <div className="absolute right-[22%] top-0 bottom-0 w-[1.5px]"
        style={{
          background: `linear-gradient(to bottom,
            rgba(251,146,60,0.4) 0%,
            rgba(251,146,60,0.2) ${cableEnd}%,
            transparent ${cableEnd + 2}%)`,
          animation: moving ? 'cable-vibrate 0.15s ease-in-out infinite' : 'none',
        }}
      />
      {/* Câble central */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px]"
        style={{
          background: `linear-gradient(to bottom,
            rgba(251,146,60,0.3) 0%,
            rgba(251,146,60,0.1) ${cableEnd}%,
            transparent ${cableEnd + 2}%)`,
        }}
      />
    </div>
  )
}

// ─── Machine / Moteur en haut ─────────────────────────────────────────────
function MotorRoom({ moving }: { moving: boolean }) {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
      {/* Base moteur */}
      <div className="w-16 md:w-20 h-5 md:h-6 rounded-t-lg bg-gradient-to-b from-slate-700/80 to-slate-800/80 border border-slate-600/50 flex items-center justify-center gap-1 md:gap-2 px-1 shadow-lg">
        <Pulley size={14} speed={moving ? 2 : 5} />
        <div className="flex flex-col items-center">
          <span className="text-[5px] md:text-[6px] text-white/60 font-bold uppercase tracking-wider">MOTEUR</span>
          <span className={`text-[6px] font-mono transition-colors ${moving ? 'text-emerald-400' : 'text-white/50'}`}>
            {moving ? '⚡ ON' : '— OFF'}
          </span>
        </div>
        <Pulley size={14} speed={moving ? 2 : 5} />
      </div>
      {/* Supports moteur */}
      <div className="flex justify-between px-1">
        <div className="w-1 h-2 bg-slate-600/40 rounded-b" />
        <div className="w-1 h-2 bg-slate-600/40 rounded-b" />
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export default function ElevatorAnimation() {
  const [currentFloor, setCurrentFloor] = useState<Floor>(1)
  const [targetFloor, setTargetFloor] = useState<Floor>(3)
  const [moving, setMoving] = useState(false)
  const [doorsOpen, setDoorsOpen] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const cycleRef = useRef<ReturnType<typeof setInterval>>()
  const floorRef = useRef<Floor>(1)

  useEffect(() => {
    // Initial door open
    const openTimer = setTimeout(() => setDoorsOpen(true), 600)
    const closeTimer = setTimeout(() => setDoorsOpen(false), 2600)

    cycleRef.current = setInterval(() => {
      setMoving(true)
      setDoorsOpen(false)

      const current = floorRef.current
      const available = FLOORS.filter(f => f !== current)
      const next = available[Math.floor(Math.random() * available.length)]
      setTargetFloor(next)
      setDirection(next > current ? 'up' : 'down')

      setTimeout(() => {
        setCurrentFloor(next)
        floorRef.current = next
        setMoving(false)
        setDoorsOpen(true)
        setTimeout(() => { setDoorsOpen(false) }, 2200)
      }, 2800)
    }, 8000)

    return () => {
      clearInterval(cycleRef.current)
      clearTimeout(openTimer)
      clearTimeout(closeTimer)
    }
  }, [])

  const floorToPercent = (floor: Floor): number => 78 - ((floor - 1) * 13)
  const cabinPosition = moving ? floorToPercent(targetFloor) : floorToPercent(currentFloor)

  return (
    <div className="flex flex-col items-center gap-3 md:gap-4 w-full">
      {/* ─── PANEL DE CONTRÔLE ─── */}
      <ControlPanel
        moving={moving}
        currentFloor={currentFloor}
        targetFloor={targetFloor}
        direction={direction}
        doorsOpen={doorsOpen}
      />

      {/* ─── ASCENSEUR ─── */}
      <div className="relative w-[180px] h-[340px] md:w-[240px] md:h-[440px]">
        {/* Moteur / Poulies */}
        <MotorRoom moving={moving} />

        {/* Câbles */}
        <Cables cabinPosition={cabinPosition} moving={moving} />

        {/* Cage */}
        <div className="absolute inset-0 top-4 rounded-xl border-2 border-slate-700/50 bg-gradient-to-b from-slate-800/30 to-slate-900/30 backdrop-blur-sm overflow-hidden shadow-2xl shadow-amber-500/5">
          <div className="absolute left-0 top-4 bottom-0 w-1 bg-gradient-to-b from-slate-700/40 to-slate-800/40 rounded-l-xl" />
          <div className="absolute right-0 top-4 bottom-0 w-1 bg-gradient-to-b from-slate-700/40 to-slate-800/40 rounded-r-xl" />
          <div className="absolute top-4 left-0 right-0 h-1 bg-gradient-to-r from-slate-700/40 via-slate-600/20 to-slate-700/40" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-700/60 via-slate-600/40 to-slate-700/60 rounded-b-xl" />

          {/* Lignes de repère horizontales */}
          {FLOORS.map((floor) => (
            <div key={floor}
              className="absolute left-1 right-1 h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
              style={{ top: `${76 - ((floor - 1) * 13)}%` }}
            />
          ))}

          {/* Marqueurs d'étages */}
          {FLOORS.map((floor) => (
            <div key={floor}
              className={`absolute right-2 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-bold transition-all duration-700 ${
                floor === currentFloor && !moving
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50 scale-110'
                  : floor === targetFloor && moving
                    ? 'bg-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-700/40 text-white/50'
              }`}
              style={{ top: `${76 - ((floor - 1) * 13)}%` }}
            >
              {floor}
            </div>
          ))}

          {/* CABINE */}
          <div
            className="absolute left-1.5 right-1.5 z-10 transition-all duration-[2500ms] ease-in-out"
            style={{ top: `${cabinPosition}%`, height: '16%' }}
          >
            <div className="relative w-full h-full rounded-md border overflow-hidden bg-gradient-to-br from-slate-700/90 to-slate-800/90 border-amber-500/40 shadow-lg shadow-amber-500/10">
              {/* Toit cabine lumineux */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/70 via-amber-400/50 to-amber-500/70" />
              <div className="absolute top-1 left-2 right-2 h-1.5 rounded-full bg-gradient-to-b from-amber-300/15 to-transparent" />

              {/* PORTE GAUCHE */}
              <div className={`absolute top-0 left-0 bottom-0 w-1/2 bg-gradient-to-r from-amber-600/70 to-amber-500/50 border-r border-amber-400/30 transition-all duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${doorsOpen ? '-translate-x-full' : 'translate-x-0'}`}>
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3/4 h-px bg-amber-300/20 rounded-full" />
                <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-3/4 h-px bg-amber-300/10 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400/30" />
              </div>

              {/* PORTE DROITE */}
              <div className={`absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-amber-600/70 to-amber-500/50 border-l border-amber-400/30 transition-all duration-[1200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${doorsOpen ? 'translate-x-full' : 'translate-x-0'}`}>
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3/4 h-px bg-amber-300/20 rounded-full" />
                <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-3/4 h-px bg-amber-300/10 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400/30" />
              </div>

              {/* Intérieur */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${doorsOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-center">
                  <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-0.5 animate-float">
                    <span className="text-emerald-400 text-[9px] md:text-xs">✓</span>
                  </div>
                  <p className="text-[5px] md:text-[7px] text-white/60 uppercase tracking-widest">Bienvenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contrepoids */}
        <div className={`absolute right-0 h-7 md:h-9 w-1.5 rounded-sm bg-gradient-to-b from-slate-600/50 to-slate-700/50 transition-all duration-[2500ms] ease-in-out`}
          style={{ top: `${Math.min(78, cabinPosition + 8)}%` }}
        />
      </div>

      {/* ─── INDICATEUR DE CHARGE ─── */}
      <LoadIndicator moving={moving} />

      {/* ─── STATUT ─── */}
      <div className={`text-[8px] md:text-[10px] font-medium transition-all duration-500 ${
        moving ? 'text-amber-400/80' : doorsOpen ? 'text-emerald-400/80' : 'text-white/50'
      }`}>
        {moving
          ? `⏳ En route vers l'étage ${targetFloor}...`
          : doorsOpen
            ? `✅ Arrivé à l'étage ${currentFloor} — Portes ouvertes`
            : '🔋 En attente — Système prêt'
        }
      </div>

      <style>{elevatorStyles}</style>
    </div>
  )
}

const elevatorStyles = `
  @keyframes pulley-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes cable-vibrate {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(0.5px); }
  }
`
