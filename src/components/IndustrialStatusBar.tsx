// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Industrial Status Bar
//  Bandeau animé avec indicateurs de production en temps réel
//  Compteurs, voyants, flux de données — style salle de contrôle
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react'

interface Metric {
  label: string
  value: number
  unit: string
  icon: string
  color: string
}

export default function IndustrialStatusBar() {
  const [time, setTime] = useState(new Date())
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'Production', value: 48, unit: 'cmd/mois', icon: '🏭', color: 'text-emerald-400' },
    { label: 'Taux OK', value: 92, unit: '%', icon: '✅', color: 'text-emerald-400' },
    { label: 'Disponible', value: 97, unit: '%', icon: '⚡', color: 'text-amber-400' },
  ])

  // Time update — every second
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Metrics update — every 4s (stable values, no cascading render)
  useEffect(() => {
    const iv = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: m.label === 'Production' ? 42 + Math.floor(Math.random() * 15)
             : m.label === 'Taux OK' ? 85 + Math.floor(Math.random() * 12)
             : 94 + Math.floor(Math.random() * 5),
      })))
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  const signalBars = useMemo(() => {
    const heights = [6, 10, 14, 8, 11]
    const opacities = [0.4, 0.6, 0.5, 0.7, 0.35]
    const speeds = [0.6, 0.8, 0.5, 0.9, 0.7]
    return Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="w-[2px] rounded-full"
        style={{
          height: `${heights[i]}px`,
          background: `rgba(251,146,60,${opacities[i]})`,
          animation: `signal-bar ${speeds[i]}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))
  }, [])

  return (
    <div className="w-full px-3 md:px-6 py-2">
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/40 px-3 md:px-5 py-2 md:py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          {/* Signal / Connectivité */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-end gap-[2px] h-4">
              {signalBars}
            </div>
            <span className="text-[7px] md:text-[8px] text-white/50 font-semibold uppercase tracking-wider ml-1 hidden md:block">SIGNAL</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] md:text-xs font-mono font-bold text-white/80">
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Metrics */}
          {metrics.map((m, i) => (
            <div key={i} className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px]">{m.icon}</span>
              <span className="text-[9px] text-white/50 font-medium">{m.label}</span>
              <span className={`text-[11px] font-bold font-mono ${m.color}`}>{m.value}</span>
              <span className="text-[8px] text-white/40">{m.unit}</span>
            </div>
          ))}

          {/* Système */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] md:text-[8px] text-white/50 font-semibold uppercase tracking-wider">ONLINE</span>
          </div>
        </div>

        {/* Barre de flux de données */}
        <div className="mt-1.5 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent animate-data-flow" />
        </div>
      </div>
      <style>{statusBarStyles}</style>
    </div>
  )
}

const statusBarStyles = `
  @keyframes signal-bar {
    from { opacity: 0.3; }
    to { opacity: 1; }
  }
  @keyframes data-flow {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
  }
`
