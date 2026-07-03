import { useState } from 'react'
import rmascLogo from '../../assets/rmasc-logo.png.png'

// ─── Workspace types ────────────────────────────────────────────────────────
export type Workspace = 'direction' | 'bureau-etude' | 'production' | 'stock' | 'extensions'

// ─── Factory emoji icon ─────────────────────────────────────────────────────
function FactoryIcon() {
  return (
    <svg className="w-10 h-10 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20V8a2 2 0 0 1 2-2h2v12"/>
      <path d="M6 20V6a2 2 0 0 1 2-2h2v16"/>
      <path d="M10 20V4a2 2 0 0 1 2-2h2v18"/>
      <path d="M14 20v-8a2 2 0 0 1 2-2h4v10"/>
      <path d="M2 20h20"/>
    </svg>
  )
}

export default function LandingScreen({ onSelect }: { onSelect: (ws: Workspace) => void }) {
  const [hovered, setHovered] = useState<Workspace | null>(null)

  const cards: { key: Workspace; icon: string; title: string; subtitle: string; locked: boolean; color: string }[] = [
    {
      key: 'direction',
      icon: '👑',
      title: 'DIRECTION & ADMINISTRATION',
      subtitle: 'Contrôle global, commandes, validation, tableau de bord décisionnel.',
      locked: false,
      color: 'from-amber-500 to-orange-600',
    },
    {
      key: 'bureau-etude',
      icon: '📐',
      title: "BUREAU D'ÉTUDES & PLM",
      subtitle: 'Plans techniques, validation des dessins, cycle de vie des commandes.',
      locked: false,
      color: 'from-sky-500 to-indigo-600',
    },
    {
      key: 'production',
      icon: '🏭',
      title: 'PRODUCTION & ATELIER',
      subtitle: 'Suivi de fabrication, ordres de production, contrôle qualité.',
      locked: false,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      key: 'stock',
      icon: '📦',
      title: 'STOCKS & LOGISTIQUE',
      subtitle: 'Gestion des stocks, inventaire, expéditions et réceptions.',
      locked: true,
      color: 'from-violet-500 to-purple-600',
    },
    {
      key: 'extensions',
      icon: '🔧',
      title: 'MODULES FUTURS',
      subtitle: 'Comptabilité, RH, CRM — extensions en développement.',
      locked: true,
      color: 'from-slate-500 to-slate-600',
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      {/* Abstract industrial grid background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Top bar */}
      <header className="flex-shrink-0 px-8 py-5 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <FactoryIcon />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]">RM</span><span className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]">ASC</span> <span className="text-amber-400">FACTORY</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-widest uppercase">
              Progiciel de Gestion Intégré
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-50/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">Système opérationnel</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Version</p>
            <p className="text-sm font-bold text-amber-400">v2.5.2 — Factory</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div className="text-center mb-10">
          <div className="mb-6 flex items-center justify-center">
            <img src={rmascLogo} alt="RMASC" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">
            🏭 <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]">RM</span><span className="text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.7)]">ASC</span> FACTORY
          </h2>
          <p className="text-slate-400 text-lg max-w-xl">
            Progiciel de Gestion Intégré
          </p>
          <p className="text-slate-500 text-sm mt-3 max-w-md">
            Sélectionnez votre poste opérationnel pour accéder à l'interface de travail dédiée.
          </p>
        </div>

        {/* Workspace selection cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl w-full">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={() => !card.locked && onSelect(card.key)}
              onMouseEnter={() => setHovered(card.key)}
              onMouseLeave={() => setHovered(null)}
              disabled={card.locked}
              className={`relative text-left p-5 rounded-2xl border transition-all duration-300 ${
                card.locked
                  ? 'border-white/5 bg-surface-50/[0.02] cursor-not-allowed opacity-50'
                  : hovered === card.key
                    ? 'border-amber-400/40 bg-surface-50/[0.06] scale-[1.02] shadow-2xl shadow-amber-500/10'
                    : 'border-white/10 bg-surface-50/[0.03] hover:border-white/20 hover:bg-surface-50/[0.05]'
              }`}
            >
              {/* Locked badge */}
              {card.locked && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold tracking-wider uppercase">
                    🔒 Prochainement
                  </span>
                </div>
              )}

              {/* Icon with gradient circle */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                <span className="text-xl">{card.icon}</span>
              </div>
              <h3 className={`text-xs font-extrabold tracking-wide mb-1.5 text-center ${card.locked ? 'text-slate-500' : 'text-white'}`}>
                {card.title}
              </h3>
              <p className={`text-[10px] leading-relaxed text-center ${card.locked ? 'text-slate-600' : 'text-slate-400'}`}>
                {card.subtitle}
              </p>

              {!card.locked && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className={`text-[11px] font-semibold transition-colors ${
                    hovered === card.key ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    Accéder →
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-600 mt-10 text-center max-w-md">
          RMASC Factory v2.5.2 — Architecture monolithique unifiée. Base de données Neon PostgreSQL.
          Synchronisation directe Bureau d'Étude #1 (192.168.0.189:30000).
          Tous droits réservés © 2026.
        </p>
      </main>
    </div>
  )
}
